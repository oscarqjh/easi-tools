"""Checkpoint watcher — polls for new training checkpoints and runs eval pipelines."""
from __future__ import annotations

import argparse
import json
import os
import re
import zipfile
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

_CKPT_NUM_RE = re.compile(r"checkpoint-(\d+)$")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments, splitting on '--' to extract the easi command template."""
    # Split argv on '--'
    if argv is None:
        argv = sys.argv[1:]

    if "--" not in argv:
        print("Error: missing '--' separator before easi command template", file=sys.stderr)
        sys.exit(1)

    sep_idx = argv.index("--")
    watcher_args = argv[:sep_idx]
    easi_cmd = argv[sep_idx + 1:]

    if not easi_cmd:
        print("Error: no easi command provided after '--'", file=sys.stderr)
        sys.exit(1)

    parser = argparse.ArgumentParser(
        description="Watch for training checkpoints and run easi evaluations",
    )
    parser.add_argument("target_dirs", nargs="+", help="Directories to scan for checkpoint-* subdirectories")
    parser.add_argument("--output-dir", default="./logs", help="Base output directory for easi runs (default: ./logs)")
    parser.add_argument("--results-dir", default=None, help="Copy completed run dirs here")
    parser.add_argument("--scan-interval", type=int, default=600, help="Seconds between scan cycles (default: 600)")
    parser.add_argument("--zip-images", action="store_true", help="Zip images per episode when moving to --results-dir")
    parser.add_argument("--zip-all-images", action="store_true", help="Zip ALL images into one file when moving to --results-dir (fastest)")

    args = parser.parse_args(watcher_args)
    args.easi_cmd = easi_cmd

    # Extract task names from the easi command
    args.task_names = _extract_task_names(easi_cmd)
    # Also store the base command (easi cmd with task names stripped out)
    args.easi_cmd_base = _strip_tasks_from_cmd(easi_cmd, args.task_names)

    return args


def _extract_task_names(easi_cmd: list[str]) -> list[str]:
    """Extract task names from an easi start command.

    Supports both positional args and --tasks flag:
      easi start task1 task2 --backend vllm
      easi start --tasks task1,task2 --backend vllm
    """
    try:
        start_idx = easi_cmd.index("start")
    except ValueError:
        print("Error: easi command must contain 'start'", file=sys.stderr)
        sys.exit(1)

    # Check for --tasks flag first
    for i, arg in enumerate(easi_cmd):
        if arg == "--tasks" and i + 1 < len(easi_cmd):
            return [t.strip() for t in easi_cmd[i + 1].split(",") if t.strip()]

    # Fall back to positional args after 'start'
    tasks = []
    i = start_idx + 1
    while i < len(easi_cmd):
        if easi_cmd[i].startswith("-"):
            break
        tasks.append(easi_cmd[i])
        i += 1

    if not tasks:
        print("Error: no task name found in easi command", file=sys.stderr)
        sys.exit(1)

    return tasks


def _strip_tasks_from_cmd(easi_cmd: list[str], task_names: list[str]) -> list[str]:
    """Return the easi command with task names and --tasks flag removed.

    The watcher rebuilds the --tasks flag dynamically per checkpoint.
    Only strips positional task names between 'start' and the first flag.
    """
    result = []
    try:
        start_idx = easi_cmd.index("start")
    except ValueError:
        return list(easi_cmd)

    # Find where positional args end (first flag after 'start')
    positional_end = start_idx + 1
    while positional_end < len(easi_cmd) and not easi_cmd[positional_end].startswith("-"):
        positional_end += 1

    i = 0
    while i < len(easi_cmd):
        if easi_cmd[i] == "--tasks" and i + 1 < len(easi_cmd):
            i += 2  # skip --tasks and its value
            continue
        # Only strip task names in the positional region
        if start_idx < i < positional_end and easi_cmd[i] in task_names:
            i += 1
            continue
        result.append(easi_cmd[i])
        i += 1
    return result


def discover_checkpoints(target_dirs: Path | list[Path]) -> list[Path]:
    """Find checkpoint-* dirs that have trainer_state.json, sorted by number ascending.

    Accepts a single directory or a list of directories to scan.
    """
    if isinstance(target_dirs, (str, Path)):
        target_dirs = [target_dirs]

    checkpoints = []
    for target_dir in target_dirs:
        target = Path(target_dir)
        if not target.is_dir():
            continue
        for d in target.iterdir():
            if not d.is_dir():
                continue
            m = _CKPT_NUM_RE.match(d.name)
            if not m:
                continue
            if not (d / "trainer_state.json").exists():
                continue
            checkpoints.append((int(m.group(1)), d))

    checkpoints.sort(key=lambda x: x[0])
    return [d for _, d in checkpoints]


_STALE_THRESHOLD_SECONDS = 1800  # 30 minutes


def scan_completed_runs(
    task_dir: Path,
    stale_threshold: float = _STALE_THRESHOLD_SECONDS,
) -> tuple[set[str], list[Path], list[Path]]:
    """Scan an easi task output directory for completed, stale, and in-progress runs.

    A run without summary.json is considered:
    - **in-progress** if any file was modified within stale_threshold seconds
    - **stale** otherwise (safe to delete)

    Returns:
        completed: set of resolved model paths that have summary.json
        stale: list of run dir Paths that are stale (safe to delete)
        in_progress: list of run dir Paths that appear to still be running
    """
    completed: set[str] = set()
    stale: list[Path] = []
    in_progress: list[Path] = []

    if not task_dir.is_dir():
        return completed, stale, in_progress

    now = time.time()

    for run_dir in sorted(task_dir.iterdir()):
        if not run_dir.is_dir():
            continue
        config_file = run_dir / "config.json"
        if not config_file.exists():
            continue

        try:
            config = json.loads(config_file.read_text())
        except (json.JSONDecodeError, OSError):
            continue

        model = config.get("cli_options", {}).get("model") or config.get("model")
        if not model:
            continue

        model_resolved = str(Path(model).resolve())

        if (run_dir / "summary.json").exists():
            completed.add(model_resolved)
        else:
            latest_mtime = _latest_mtime(run_dir)
            if (now - latest_mtime) < stale_threshold:
                in_progress.append(run_dir)
            else:
                stale.append(run_dir)

    return completed, stale, in_progress


def _latest_mtime(directory: Path) -> float:
    """Return the most recent modification time of any file in a directory."""
    latest = directory.stat().st_mtime
    episodes_dir = directory / "episodes"
    if episodes_dir.is_dir():
        # Check the newest episode dir for recent writes
        ep_dirs = sorted(episodes_dir.iterdir(), reverse=True)
        for ep_dir in ep_dirs[:1]:
            if ep_dir.is_dir():
                for f in ep_dir.iterdir():
                    mtime = f.stat().st_mtime
                    if mtime > latest:
                        latest = mtime
    return latest


def _log(msg: str) -> None:
    """Print a timestamped log message."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def build_eval_command(
    easi_cmd_base: list[str],
    tasks: list[str],
    model_path: str,
    output_dir: str,
) -> list[str]:
    """Build the full easi start command with --tasks, --model, --output-dir."""
    return [
        *easi_cmd_base,
        "--tasks", ",".join(tasks),
        "--model", model_path,
        "--output-dir", output_dir,
    ]


def find_run_dir(task_dir: Path, model_path: str) -> Path | None:
    """Find the run directory for a given model path by scanning config.json files."""
    if not task_dir.is_dir():
        return None

    model_resolved = str(Path(model_path).resolve())

    for run_dir in sorted(task_dir.iterdir(), reverse=True):  # newest first
        if not run_dir.is_dir():
            continue
        config_file = run_dir / "config.json"
        if not config_file.exists():
            continue
        try:
            config = json.loads(config_file.read_text())
            m = config.get("cli_options", {}).get("model") or config.get("model")
            if m and str(Path(m).resolve()) == model_resolved:
                return run_dir
        except (json.JSONDecodeError, OSError):
            continue

    return None


def _move_run_to_results(
    src: Path, dest: Path,
    zip_images: bool = False,
    zip_all_images: bool = False,
) -> None:
    """Move a run directory to the results dir, leaving a stub behind.

    Default (no flags): moves the entire run dir to dest, then recreates
    a stub at src with just config.json + summary.json so the watcher
    still sees the run as completed.  Instant on the same filesystem.

    zip_images: zip PNGs per episode before moving.
    zip_all_images: zip ALL PNGs into one file before moving.
    """
    # Optionally zip images in-place before moving
    episodes_src = src / "episodes"
    if episodes_src.is_dir():
        if zip_all_images:
            _zip_all_images(episodes_src)
        elif zip_images:
            _zip_episode_images(episodes_src)

    # Save stub files before moving (top-level + per-episode metadata)
    stub_files: dict[str, bytes] = {}
    for f in src.iterdir():
        if f.is_file():
            stub_files[f.name] = f.read_bytes()

    episode_stubs: dict[str, dict[str, bytes]] = {}
    if episodes_src.is_dir():
        for ep_dir in episodes_src.iterdir():
            if not ep_dir.is_dir():
                continue
            ep_files = {}
            for f in ep_dir.iterdir():
                if f.is_file() and f.suffix not in (".png", ".zip"):
                    ep_files[f.name] = f.read_bytes()
            if ep_files:
                episode_stubs[ep_dir.name] = ep_files

    # Move entire run dir to dest (instant rename on same filesystem)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dest))

    # Recreate stub at original location (top-level + per-episode metadata)
    src.mkdir(parents=True, exist_ok=True)
    for name, data in stub_files.items():
        (src / name).write_bytes(data)
    if episode_stubs:
        ep_stub_dir = src / "episodes"
        ep_stub_dir.mkdir(exist_ok=True)
        for ep_name, files in episode_stubs.items():
            ep_dir = ep_stub_dir / ep_name
            ep_dir.mkdir(exist_ok=True)
            for fname, data in files.items():
                (ep_dir / fname).write_bytes(data)


def _zip_episode_images(episodes_dir: Path) -> None:
    """Zip PNG images in each episode folder in-place.

    After zipping, the loose PNG files are deleted to save space.
    """
    for ep_dir in sorted(episodes_dir.iterdir()):
        if not ep_dir.is_dir():
            continue

        image_files = [f for f in ep_dir.iterdir() if f.suffix == ".png"]
        if not image_files:
            continue

        zip_path = ep_dir / "images.zip"
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
            for img in sorted(image_files):
                zf.write(img, img.name)

        for img in image_files:
            img.unlink()


def _zip_all_images(episodes_dir: Path) -> None:
    """Zip ALL PNG images across all episodes into a single images.zip.

    Creates episodes_dir/images.zip with paths like 000_ep_0/step_0000_front.png.
    After zipping, loose PNGs are deleted. Much faster than per-episode zipping.
    """
    zip_path = episodes_dir / "images.zip"
    image_files = []
    for ep_dir in sorted(episodes_dir.iterdir()):
        if not ep_dir.is_dir():
            continue
        for f in sorted(ep_dir.iterdir()):
            if f.suffix == ".png":
                image_files.append(f)

    if not image_files:
        return

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_STORED) as zf:
        for img in image_files:
            zf.write(img, f"{img.parent.name}/{img.name}")

    for img in image_files:
        img.unlink()


def run_pipeline(
    checkpoint: Path,
    easi_cmd_base: list[str],
    pending_tasks: list[str],
    output_dir: str,
    results_dir: Path | None,
    zip_images: bool = False,
    zip_all_images: bool = False,
) -> bool:
    """Run eval + post-processing pipeline for one checkpoint.

    Runs only the pending_tasks via easi start --tasks, then post-processes
    each task that now has a completed run dir.

    Returns True if any task was processed, False otherwise.
    """
    from autoeval.benchmark import extract_metrics, append_benchmark_row, get_benchmark_tsv_path
    from autoeval.profiles import get_profile

    model_path = str(checkpoint.resolve())
    num_tasks = len(pending_tasks)

    # Step 1: Run evaluation
    _log(f"[1/4] Starting eval: {checkpoint.name} ({num_tasks} task(s): {', '.join(pending_tasks)})")
    cmd = build_eval_command(easi_cmd_base, pending_tasks, model_path, output_dir)

    global _running_proc
    _running_proc = subprocess.Popen(cmd, preexec_fn=os.setsid)
    returncode = _running_proc.wait()
    _running_proc = None

    if returncode != 0:
        _log(f"[1/4] Eval finished with errors (exit {returncode})")
    else:
        _log("[1/4] Eval completed (exit 0)")

    # Steps 2-4: Post-process each task that completed (has summary.json),
    # even if the overall exit code was non-zero (some tasks may have succeeded)
    any_processed = False
    for task_name in pending_tasks:
        task_dir = Path(output_dir) / task_name
        run_dir = find_run_dir(task_dir, model_path)

        if run_dir is None or not (run_dir / "summary.json").exists():
            _log(f"  [{task_name}] No completed run found, skipping")
            continue

        any_processed = True

        # Step 2: Extract metrics (BEFORE moving — data is still in src)
        _log(f"  [{task_name}] Extracting metrics...")
        try:
            profile_name, row = extract_metrics(run_dir)
        except Exception as e:
            _log(f"  [{task_name}] Metrics extraction failed: {e}")
            profile_name, row = None, None

        # Step 3: Move results to results_dir (leaves stub in output_dir)
        final_path = str(run_dir.resolve())
        if results_dir:
            dest = Path(results_dir) / task_name / run_dir.name
            if dest.exists():
                _log(f"  [{task_name}] Already in results dir (skipped)")
                final_path = str(dest.resolve())
            else:
                try:
                    _move_run_to_results(run_dir, dest, zip_images=zip_images, zip_all_images=zip_all_images)
                    _log(f"  [{task_name}] Moved to {dest}")
                    final_path = str(dest.resolve())
                except Exception as e:
                    _log(f"  [{task_name}] Move failed: {e}")

        # Step 4: Append to benchmark TSV (auto-named per profile)
        if row and profile_name:
            profile = get_profile(task_name)
            tsv_path = get_benchmark_tsv_path(output_dir, profile_name)
            row["Results_Path"] = final_path
            try:
                added = append_benchmark_row(tsv_path, row, profile.COLUMNS)
                if added:
                    _log(f"  [{task_name}] Appended to {tsv_path}")
                else:
                    _log(f"  [{task_name}] Already in {tsv_path} (skipped)")
            except Exception as e:
                _log(f"  [{task_name}] TSV append failed: {e}")

    return any_processed


# Global reference to the running subprocess for signal forwarding
_running_proc: subprocess.Popen | None = None


def _get_proc_tree(pid: int) -> list[int]:
    """Collect a process and all its descendants (breadth-first).

    Returns PIDs in parent-first order.  Call this BEFORE sending signals,
    while the tree is still alive and /proc entries exist.
    """
    def _get_children(parent_pid: int) -> list[int]:
        try:
            children_file = Path(f"/proc/{parent_pid}/task/{parent_pid}/children")
            return [int(p) for p in children_file.read_text().split()]
        except (FileNotFoundError, ValueError, OSError):
            return []

    tree = []
    queue = [pid]
    while queue:
        p = queue.pop(0)
        tree.append(p)
        queue.extend(_get_children(p))
    return tree


def _kill_pids(pids: list[int], sig: int) -> None:
    """Send a signal to a list of PIDs (children first)."""
    for p in reversed(pids):
        try:
            os.kill(p, sig)
        except (ProcessLookupError, PermissionError):
            pass


def _signal_handler(signum, frame):
    """Kill the running subprocess tree and exit.

    Collects the full process tree BEFORE sending signals so that
    vLLM workers (which run in separate process groups) are captured
    while /proc entries still exist.  Only kills our own descendants —
    never touches processes from other watchers.
    """
    if _running_proc and _running_proc.poll() is None:
        _log("Caught signal, stopping eval process tree...")
        tree = _get_proc_tree(_running_proc.pid)
        _kill_pids(tree, signal.SIGTERM)
        try:
            _running_proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            _kill_pids(tree, signal.SIGKILL)
    sys.exit(0)


def main() -> None:
    global _running_proc

    args = parse_args()
    target_dirs = [Path(d) for d in args.target_dirs]
    output_dir = args.output_dir
    task_names = args.task_names
    easi_cmd_base = args.easi_cmd_base
    results_dir = Path(args.results_dir) if args.results_dir else None
    scan_interval = args.scan_interval

    # Register signal handlers
    signal.signal(signal.SIGINT, _signal_handler)
    signal.signal(signal.SIGTERM, _signal_handler)

    _log(f"Watcher started: targets={[str(d) for d in target_dirs]}")
    _log(f"  tasks={', '.join(task_names)}")
    _log(f"  output_dir={output_dir}, results_dir={results_dir}")
    _log(f"  scan_interval={scan_interval}s")
    _log(f"  easi_cmd_base={' '.join(easi_cmd_base)}")

    while True:
        # 1. Discover checkpoints from all target directories
        checkpoints = discover_checkpoints(target_dirs)

        # 2. Scan completed runs per task, collect stale/in-progress
        # "handled" = completed OR in-progress (don't launch new evals for these)
        handled_per_task: dict[str, set[str]] = {}
        all_stale: list[Path] = []
        all_in_progress: list[Path] = []
        for tn in task_names:
            completed, stale, in_prog = scan_completed_runs(Path(output_dir) / tn)
            # Merge completed + in-progress model paths as "handled"
            handled = set(completed)
            for run_dir in in_prog:
                try:
                    config = json.loads((run_dir / "config.json").read_text())
                    model = config.get("cli_options", {}).get("model") or config.get("model")
                    if model:
                        handled.add(str(Path(model).resolve()))
                except (json.JSONDecodeError, OSError):
                    pass
            handled_per_task[tn] = handled
            all_stale.extend(stale)
            all_in_progress.extend(in_prog)

        # 3. Clean up stale (but not in-progress)
        for stale_dir in all_stale:
            _log(f"Removing stale run dir: {stale_dir}")
            shutil.rmtree(stale_dir, ignore_errors=True)
        if all_in_progress:
            _log(f"Skipping {len(all_in_progress)} in-progress run(s)")

        # 4. Find latest checkpoint with any pending tasks (newest first)
        chosen_checkpoint = None
        pending_tasks: list[str] = []
        for ckpt in reversed(checkpoints):
            ckpt_resolved = str(ckpt.resolve())
            missing = [tn for tn in task_names if ckpt_resolved not in handled_per_task[tn]]
            if missing:
                chosen_checkpoint = ckpt
                pending_tasks = missing
                break

        # Count fully handled checkpoints
        fully_completed = sum(
            1 for ckpt in checkpoints
            if all(str(ckpt.resolve()) in handled_per_task[tn] for tn in task_names)
        )

        _log(
            f"Scan: {len(checkpoints)} checkpoints, "
            f"{fully_completed} fully completed, {len(all_stale)} stale"
        )

        if chosen_checkpoint:
            _log(f"Queue: {chosen_checkpoint.name} (pending: {', '.join(pending_tasks)})")
            _log(f"=== Pipeline: {chosen_checkpoint.name} ===")
            run_pipeline(
                checkpoint=chosen_checkpoint,
                easi_cmd_base=easi_cmd_base,
                pending_tasks=pending_tasks,
                output_dir=output_dir,
                results_dir=results_dir,
                zip_images=args.zip_images,
                zip_all_images=args.zip_all_images,
            )
            _log(f"=== Pipeline complete: {chosen_checkpoint.name} ===")
            continue  # immediate re-scan

        _log(f"Nothing pending. Next scan in {scan_interval}s...")
        time.sleep(scan_interval)


if __name__ == "__main__":
    main()
