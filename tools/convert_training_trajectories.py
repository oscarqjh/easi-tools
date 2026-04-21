#!/usr/bin/env python3
"""Convert dfs_vln_traj_gen training trajectories to easi evaluation log layout.

The training pipeline at /mnt/umm/users/qianjianheng/workspace/dfs_vln_traj_gen
produces per-step directories with RGB + depth + topological state. This tool
projects those into the same on-disk schema that easi-monitor consumes (runs +
episodes + trajectory.jsonl), so GT trajectories show up next to model runs.

Image files are symlinked (not copied) to keep the output light.

Usage (single split, e.g. ``unseen_val_filtered``):

    python -m easi_tools_convert_training_trajectories \
        --split unseen_val_filtered \
        --traj-root /mnt/umm/users/qianjianheng/workspace/dfs_vln_traj_gen/outputs/trajectories \
        --task-json-root /mnt/umm/users/qianjianheng/workspace/dfs_vln_traj_gen/outputs/traj_only_task_json \
        --mapping /mnt/umm/users/qianjianheng/workspace/dfs_vln_traj_gen/path_mapping.json \
        --benchmark-data-dir /mnt/umm/users/qianjianheng/workspace/EASI/datasets/oscarqjh_LHPR-VLN_easi/data \
        --out-dir /mnt/umm/users/qianjianheng/workspace/data/lhprvln_dfs_trajgen_easi_data

Limitations:
    - Agent rotation isn't captured in topo_state.json, so agent_pose[3:6] is
      left as zeros (matches current easi lhpr-vln runs; direction arrow
      unavailable).
    - "fail" trials are skipped by default. Pass --include-failures to include.
    - The ``unseen_train`` split isn't in the benchmark jsonl list; the train
      task uses a scene-id filter + CSV whitelist (handled in a later step).
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path

logger = logging.getLogger("convert_training_traj")

# Directory-name pattern: "<int>_<action>_for_<target>"
_STEP_DIR_RE = re.compile(r"^(-?\d+)_(move_forward|turn_left|turn_right|stop)_for_(.+)$")

# Split → output task-name mapping.
_SPLIT_TO_TASK = {
    "unseen_val_filtered": "lhpr_vln_unseen_val_gt_filtered_dfs",
    "unseen_test_filtered": "lhpr_vln_unseen_test_gt_filtered_dfs",
    "unseen_train_filtered": "lhpr_vln_unseen_train_gt_filtered_dfs",
}

# Splits whose episode list is derived from the filter CSV instead of a
# benchmark jsonl (no jsonl exists for unseen_train).
_CSV_DERIVED_SPLITS = {"unseen_train_filtered"}

# Training scenes live in HM3D ids 000–699; 700–799 are val, 800+ are test.
_TRAIN_SCENE_MAX = 700
_SCENE_ID_RE = re.compile(r"^(\d+)-")

_CAMERAS = ("front", "left", "right")


# ---- Helpers ----

def _load_jsonl(path: Path) -> list[dict]:
    with path.open() as f:
        return [json.loads(line) for line in f if line.strip()]


def _load_path_mapping(path: Path) -> list[dict]:
    data = json.loads(path.read_text())
    if not isinstance(data, list):
        raise ValueError(f"Expected a list in {path}, got {type(data).__name__}")
    return data


def _build_mapping_index(mapping: list[dict]) -> dict[tuple[str, str], list[dict]]:
    """Index mapping rows by (scene_id, instruction) for fast lookup."""
    idx: dict[tuple[str, str], list[dict]] = {}
    for row in mapping:
        key = (row["scene_id"], row["instruction"])
        idx.setdefault(key, []).append(row)
    return idx


def _build_instruction_index(mapping: list[dict]) -> dict[str, list[dict]]:
    """Index mapping rows by instruction only (used for the train split)."""
    idx: dict[str, list[dict]] = {}
    for row in mapping:
        idx.setdefault(row["instruction"], []).append(row)
    return idx


def _scene_id_num(scene_id: str) -> int:
    m = _SCENE_ID_RE.match(scene_id or "")
    return int(m.group(1)) if m else -1


def _load_filter_csv(path: Path) -> list[dict]:
    """Load the visible-ratio filter CSV as a list of row dicts (order preserved)."""
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def _load_excluded_ids(benchmark_data_dir: Path, splits: list[str]) -> set[str]:
    """Collect batch_episode ids we want to exclude from the train list."""
    excluded: set[str] = set()
    for split in splits:
        jsonl_path = benchmark_data_dir / f"{split}.jsonl"
        if not jsonl_path.exists():
            logger.warning("Exclusion split missing: %s", jsonl_path)
            continue
        for ep in _load_jsonl(jsonl_path):
            excluded.add(ep["id"])
    return excluded


def _build_train_episodes(
    filter_csv: Path,
    benchmark_data_dir: Path,
    mapping: list[dict],
) -> list[dict]:
    """Synthesise train episode dicts from the filter CSV.

    Keeps only CSV rows that (a) are not already in the val/test filtered
    splits and (b) resolve to a mapping entry whose scene id is in the
    training range (000-699). The resulting list is ordered by CSV ``id``
    (falls back to insertion order when id isn't numeric).
    """
    rows = _load_filter_csv(filter_csv)
    excluded = _load_excluded_ids(
        benchmark_data_dir, ["unseen_val_filtered", "unseen_test_filtered"],
    )
    inst_idx = _build_instruction_index(mapping)

    def _row_key(r: dict) -> tuple[int, int]:
        try:
            return (0, int(r.get("id") or 0))
        except ValueError:
            return (1, 0)

    episodes: list[dict] = []
    skipped_val_test = 0
    skipped_no_train_match = 0
    for row in sorted(rows, key=_row_key):
        batch = row.get("batch", "")
        ep_id = row.get("episode_id", "")
        composite = f"{batch}_{ep_id}"
        if composite in excluded:
            skipped_val_test += 1
            continue

        instruction = row.get("task_instruction", "")
        candidates = [
            m for m in inst_idx.get(instruction, [])
            if _scene_id_num(m.get("scene_id", "")) < _TRAIN_SCENE_MAX
        ]
        if not candidates:
            skipped_no_train_match += 1
            continue

        scene = candidates[0].get("scene_id", "")
        episodes.append({
            "id": composite,
            "instruction": instruction,
            "scene": scene,
            "batch": batch,
            "subtask_list": [None] * int(row.get("subtask_count") or 0),
        })

    logger.info(
        "Train synth: %d CSV rows, kept=%d, dropped_val_test=%d, dropped_no_train_match=%d",
        len(rows), len(episodes), skipped_val_test, skipped_no_train_match,
    )
    return episodes


def _resolve_trajectory_path(
    episode: dict,
    mapping_idx: dict[tuple[str, str], list[dict]],
    traj_root: Path,
    include_failures: bool,
) -> tuple[Path | None, str]:
    """Return ``(trajectory_dir, gt_status)`` for an episode.

    The ``result`` field in ``path_mapping.json`` is **stale** — many rows
    tagged ``fail`` now have a ``success/`` subdir on disk because
    trajectory generation was retried later. So we use ``path_mapping``
    only to locate the task directory (via ``new_path``) and probe the
    filesystem directly for ``success/trial_*`` (preferred) or, when
    ``include_failures`` is true, ``fail/trial_*``.

    Returns ``gt_status``:
      - ``"success"`` — a success trial exists on disk
      - ``"fail"``    — only a fail trial exists (and ``include_failures`` enabled)
      - ``"missing"`` — nothing usable on disk for this episode
    """
    key = (episode["scene"], episode["instruction"])
    candidates = mapping_idx.get(key, [])
    if not candidates:
        return None, "missing"

    # Extract unique task dirs from candidate new_paths (strip result/trial suffix).
    task_dirs: list[Path] = []
    for row in candidates:
        new_path = row.get("new_path", "")
        # Expected shape: '<scene>/<task>/<success|fail>/trial_N'
        parts = new_path.rsplit("/", 2)
        if len(parts) >= 3:
            task_dir = traj_root / parts[0]
        else:
            task_dir = (traj_root / new_path).parent.parent
        if task_dir not in task_dirs:
            task_dirs.append(task_dir)

    def _first_trial(base: Path) -> Path | None:
        if not base.is_dir():
            return None
        trials = sorted(
            (d for d in base.iterdir() if d.is_dir() and d.name.startswith("trial_")),
            key=lambda d: d.name,
        )
        return trials[0] if trials else None

    # Prefer any success trial across candidate task dirs.
    for task_dir in task_dirs:
        trial = _first_trial(task_dir / "success")
        if trial is not None:
            return trial, "success"

    if include_failures:
        for task_dir in task_dirs:
            trial = _first_trial(task_dir / "fail")
            if trial is not None:
                return trial, "fail"

    return None, "missing"


def _parse_step_dirs(trial_dir: Path) -> list[tuple[int, str, str, Path]]:
    """Return sorted step tuples (idx, action, target, step_dir).

    Skips the initial ``-1_*`` dir (starting rest state).
    """
    steps = []
    for d in trial_dir.iterdir():
        if not d.is_dir():
            continue
        m = _STEP_DIR_RE.match(d.name)
        if not m:
            logger.debug("Skipping non-step dir: %s", d.name)
            continue
        idx = int(m.group(1))
        if idx < 0:
            continue
        steps.append((idx, m.group(2), m.group(3), d))
    steps.sort(key=lambda t: t[0])
    return steps


def _load_trial_poses(trial_dir: Path) -> tuple[list[list[float]], list[float], list[int]]:
    """Load concatenated (pos, yaw, subtask_stage) arrays from ``trial_dir/task.json``.

    Sub-trials are keyed ``trial_0``, ``trial_1``, … and concatenated in that
    order. The resulting flat array aligns with step directories ``-1, 0, 1, …``
    sorted by their numeric prefix, i.e. entry ``i`` corresponds to the dir
    whose prefix is ``i - 1``.

    Returns ``(pos_list, yaw_list, subtask_stage_list)`` all the same length.
    """
    task_json_path = trial_dir / "task.json"
    if not task_json_path.exists():
        raise FileNotFoundError(f"Missing task.json in trial dir: {trial_dir}")
    data = json.loads(task_json_path.read_text())
    trials = data.get("trial") or {}
    if not isinstance(trials, dict):
        raise ValueError(f"Malformed task.json (trial not a dict): {task_json_path}")

    # Sort by numeric suffix: trial_0, trial_1, trial_2, …
    def _trial_idx(name: str) -> int:
        m = re.search(r"(\d+)$", name)
        return int(m.group(1)) if m else -1

    pos: list[list[float]] = []
    yaw: list[float] = []
    subtask: list[int] = []
    for sub_idx, key in enumerate(sorted(trials, key=_trial_idx)):
        sub = trials[key]
        sub_pos = sub.get("pos") or []
        sub_yaw = sub.get("yaw") or []
        if len(sub_yaw) != len(sub_pos):
            # Pad or truncate so lengths match; log if divergent.
            logger.debug(
                "pos/yaw length mismatch in %s[%s]: %d vs %d",
                task_json_path, key, len(sub_pos), len(sub_yaw),
            )
            sub_yaw = (sub_yaw + [0.0] * len(sub_pos))[: len(sub_pos)]
        pos.extend(sub_pos)
        yaw.extend(sub_yaw)
        subtask.extend([sub_idx] * len(sub_pos))
    return pos, yaw, subtask


def _symlink_images(step_dir: Path, episode_dir: Path, step_idx: int) -> dict[str, str]:
    """Symlink camera PNGs into the episode dir. Returns {camera: basename}."""
    rgb: dict[str, str] = {}
    for cam in _CAMERAS:
        src = step_dir / f"{cam}.png"
        if not src.exists():
            continue
        dst_name = f"step_{step_idx:04d}_{cam}.png"
        dst = episode_dir / dst_name
        if dst.exists() or dst.is_symlink():
            dst.unlink()
        os.symlink(src.resolve(), dst)
        rgb[cam] = dst_name
    return rgb


# ---- Episode writers ----

def _write_trajectory_jsonl(
    episode_dir: Path,
    steps: list[tuple[int, str, str, Path]],
    pos_list: list[list[float]],
    yaw_list: list[float],
    subtask_list: list[int],
    instruction: str,
) -> int:
    """Write trajectory.jsonl with one line per step.

    ``pos_list`` / ``yaw_list`` / ``subtask_list`` are concatenated across
    sub-trials and indexed by ``prefix + 1`` so that the initial ``-1`` dir
    maps to index 0.
    """
    traj_path = episode_dir / "trajectory.jsonl"
    n_steps = 0
    total = len(pos_list)

    with traj_path.open("w") as f:
        for i, (prefix, action, target, step_dir) in enumerate(steps):
            rgb = _symlink_images(step_dir, episode_dir, i)

            pose_idx = prefix + 1
            if 0 <= pose_idx < total:
                p = pos_list[pose_idx]
                y = yaw_list[pose_idx]
                subtask = subtask_list[pose_idx]
            else:
                logger.warning(
                    "Pose index %d out of range (total=%d) in %s",
                    pose_idx, total, step_dir.parent,
                )
                p, y, subtask = [0.0, 0.0, 0.0], 0.0, 0

            if len(p) < 3:
                p = list(p) + [0.0] * (3 - len(p))
            # Rotation around the vertical axis only; store yaw in ry slot.
            agent_pose = [float(p[0]), float(p[1]), float(p[2]), 0.0, float(y), 0.0]

            entry = {
                "step": i + 1,
                "type": "step",
                "action": action,
                "llm_response": None,
                "triggered_fallback": False,
                "rgb_path": rgb.get("front", ""),
                "front_rgb_path": rgb.get("front"),
                "left_rgb_path": rgb.get("left"),
                "right_rgb_path": rgb.get("right"),
                "agent_pose": agent_pose,
                "reward": 0.0,
                "done": action == "stop" and i == len(steps) - 1,
                "info": {
                    "action_target": target,
                    "subtask_stage": subtask,
                    "last_action_success": 1.0,
                    "gt_instruction": instruction,
                },
            }
            f.write(json.dumps(entry) + "\n")
            n_steps += 1
    return n_steps


def _write_result(episode_dir: Path, episode: dict, num_steps: int, gt_status: str) -> None:
    """Write a synthetic result.json describing this episode's GT status."""
    success_flag = 1.0 if gt_status == "success" else 0.0
    num_subtasks = float(len(episode.get("subtask_list", [])))
    (episode_dir / "result.json").write_text(json.dumps({
        "task_success": success_flag,
        "oracle_success": success_flag,
        "spl": success_flag,
        "navigation_error": 0.0,
        "num_steps": float(num_steps),
        "num_subtasks": num_subtasks,
        "subtasks_completed": num_subtasks if gt_status == "success" else 0.0,
        "episode_id": f"ep_{episode['_index']}",
        "instruction": episode["instruction"],
        "elapsed_seconds": 0.0,
        "source": "dfs_vln_traj_gen",
        "gt_status": gt_status,
        "scene": episode["scene"],
        "batch": episode.get("batch"),
        "batch_episode_id": episode["id"],
    }, indent=2))


def _sanitize_dirname(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)


def convert_episode(
    episode: dict,
    trial_dir: Path | None,
    run_dir: Path,
    index: int,
    gt_status: str,
) -> tuple[Path, int]:
    """Materialise a single episode under ``run_dir``. Returns (ep_dir, n_steps).

    When ``trial_dir`` is ``None`` (``gt_status == "missing"``), writes an empty
    ``trajectory.jsonl`` and a ``result.json`` tagged as missing so the
    episode still appears in the monitor at the expected index.
    """
    episode = dict(episode)
    episode["_index"] = index

    episode_id = f"ep_{index}"
    episode_dir = run_dir / "episodes" / f"{index:03d}_{_sanitize_dirname(episode_id)}"
    episode_dir.mkdir(parents=True, exist_ok=True)

    if trial_dir is None:
        (episode_dir / "trajectory.jsonl").write_text("")
        _write_result(episode_dir, episode, num_steps=0, gt_status=gt_status)
        return episode_dir, 0

    steps = _parse_step_dirs(trial_dir)
    pos_list, yaw_list, subtask_list = _load_trial_poses(trial_dir)
    n_steps = _write_trajectory_jsonl(
        episode_dir, steps, pos_list, yaw_list, subtask_list,
        episode["instruction"],
    )
    _write_result(episode_dir, episode, num_steps=n_steps, gt_status=gt_status)
    return episode_dir, n_steps


def _write_run_metadata(
    run_dir: Path,
    task_name: str,
    split: str,
    episode_records: list[tuple[str, int]],
    status_counts: dict[str, int],
) -> None:
    num_eps = len(episode_records)
    total_steps = sum(n for _, n in episode_records)
    avg_steps = (total_steps / num_eps) if num_eps else 0.0
    success_rate = (status_counts.get("success", 0) / num_eps) if num_eps else 0.0

    (run_dir / "summary.json").write_text(json.dumps({
        "num_episodes": num_eps,
        "success_rate": success_rate,
        "avg_steps": avg_steps,
        "median_steps": avg_steps,  # placeholder; exact median not critical here
        "metrics": {
            "task_success": success_rate,
            "gt_success_count": status_counts.get("success", 0),
            "gt_fail_count": status_counts.get("fail", 0),
            "gt_missing_count": status_counts.get("missing", 0),
        },
        "model": "dfs_vln_traj_gen",
        "backend": "ground_truth",
        "source": "training_trajectory",
    }, indent=2))

    (run_dir / "config.json").write_text(json.dumps({
        "run_id": run_dir.name,
        "cli_options": {
            "task_name": task_name,
            "model": "dfs_vln_traj_gen",
            "agent": "ground_truth",
            "backend": "ground_truth",
            "split": split,
        },
        "source": "dfs_vln_traj_gen",
        "task_config": {
            "name": task_name,
            "display_name": f"LHPR-VLN {split} (DFS GT)",
            "description": "Ground-truth trajectories converted from dfs_vln_traj_gen.",
            "simulator": "habitat_sim:v0_3_0",
            "task_class": "easi.tasks.lhpr_vln.task.LHPRVLNTask",
            "max_steps": 2000,
            "dataset": {
                "repo_id": "oscarqjh/LHPR-VLN_easi",
                "split": split,
            },
        },
    }, indent=2))


# ---- Entry point ----

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", required=True, choices=sorted(_SPLIT_TO_TASK))
    parser.add_argument("--traj-root", type=Path, required=True)
    parser.add_argument("--task-json-root", type=Path, required=True,
                        help="Unused for now; kept for future cross-checks.")
    parser.add_argument("--mapping", type=Path, required=True,
                        help="Path to path_mapping.json.")
    parser.add_argument("--benchmark-data-dir", type=Path, required=True,
                        help="Directory containing <split>.jsonl files.")
    parser.add_argument("--filter-csv", type=Path, default=None,
                        help="Visible-ratio filter CSV. Required for unseen_train_filtered.")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--include-failures", action="store_true",
                        help="Also emit trajectories from the fail/ dir.")
    parser.add_argument("--limit", type=int, default=None,
                        help="Process only the first N episodes (debug).")
    parser.add_argument("--run-id", default=None,
                        help="Override the run directory name (default: <ts>_gt).")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    mapping = _load_path_mapping(args.mapping)
    mapping_idx = _build_mapping_index(mapping)
    logger.info("Indexed %d mapping rows (%d unique keys)", len(mapping), len(mapping_idx))

    if args.split in _CSV_DERIVED_SPLITS:
        if args.filter_csv is None:
            logger.error("--filter-csv is required for split %s", args.split)
            return 2
        episodes = _build_train_episodes(
            args.filter_csv, args.benchmark_data_dir, mapping,
        )
    else:
        jsonl_path = args.benchmark_data_dir / f"{args.split}.jsonl"
        if not jsonl_path.exists():
            logger.error("Benchmark jsonl not found: %s", jsonl_path)
            return 2
        episodes = _load_jsonl(jsonl_path)
        logger.info("Loaded %d episodes from %s", len(episodes), jsonl_path.name)

    if args.limit:
        episodes = episodes[: args.limit]

    task_name = _SPLIT_TO_TASK[args.split]
    run_id = args.run_id or f"{datetime.now():%Y%m%d_%H%M%S}_gt"
    run_dir = args.out_dir / task_name / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Writing to %s", run_dir)

    converted: list[tuple[str, int]] = []
    status_counts = {"success": 0, "fail": 0, "missing": 0}
    missing_ids: list[str] = []
    fail_ids: list[str] = []
    for i, ep in enumerate(episodes):
        traj_path, gt_status = _resolve_trajectory_path(
            ep, mapping_idx, args.traj_root, args.include_failures,
        )
        if traj_path is not None and not traj_path.is_dir():
            logger.warning("[%03d] Mapped path missing on disk: %s", i, traj_path)
            traj_path, gt_status = None, "missing"

        status_counts[gt_status] += 1
        if gt_status == "missing":
            missing_ids.append(ep["id"])
        elif gt_status == "fail":
            fail_ids.append(ep["id"])

        ep_dir, n_steps = convert_episode(ep, traj_path, run_dir, i, gt_status)
        converted.append((ep_dir.name, n_steps))
        logger.info(
            "[%03d] %s [%s] -> %s (%d steps)",
            i, ep["id"], gt_status, ep_dir.name, n_steps,
        )

    _write_run_metadata(run_dir, task_name, args.split, converted, status_counts)

    logger.info(
        "Done. %d total (%d success, %d fail, %d missing).",
        len(converted), status_counts["success"], status_counts["fail"], status_counts["missing"],
    )
    if missing_ids:
        logger.warning("Missing: %s", ", ".join(missing_ids[:20]) + (" …" if len(missing_ids) > 20 else ""))
    if fail_ids:
        logger.warning("Fail: %s", ", ".join(fail_ids[:20]) + (" …" if len(fail_ids) > 20 else ""))

    print(json.dumps({
        "out_dir": str(run_dir),
        "counts": status_counts,
        "missing_ids": missing_ids,
        "fail_ids": fail_ids,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
