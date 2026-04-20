import json
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

from autoeval.watcher import parse_args


def test_parse_args_default_config():
    args = parse_args([])
    assert args.config == "autoeval.yaml"


def test_parse_args_custom_config():
    args = parse_args(["--config", "my_config.yaml"])
    assert args.config == "my_config.yaml"


def test_discover_checkpoints(tmp_path):
    """Find ready checkpoints sorted by number."""
    from autoeval.watcher import discover_checkpoints

    for n in [30, 105, 45, 60]:
        d = tmp_path / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")
        (d / "config.json").write_text("{}")

    (tmp_path / "checkpoint-999").mkdir()
    (tmp_path / "checkpoint-999" / "config.json").write_text("{}")
    (tmp_path / "runs").mkdir()

    result = discover_checkpoints(tmp_path)
    assert len(result) == 4
    assert [r.name for r in result] == [
        "checkpoint-30", "checkpoint-45", "checkpoint-60", "checkpoint-105"
    ]


def test_discover_checkpoints_empty(tmp_path):
    from autoeval.watcher import discover_checkpoints
    assert discover_checkpoints(tmp_path) == []


def test_discover_checkpoints_filter_by_name(tmp_path):
    """Filter accepts full checkpoint-<N> directory names."""
    from autoeval.watcher import discover_checkpoints

    for n in [30, 60, 105]:
        d = tmp_path / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")

    result = discover_checkpoints(
        tmp_path, filter_items=["checkpoint-30", "checkpoint-105"]
    )
    assert [r.name for r in result] == ["checkpoint-30", "checkpoint-105"]


def test_discover_checkpoints_filter_by_number(tmp_path):
    """Filter accepts integer step numbers."""
    from autoeval.watcher import discover_checkpoints

    for n in [30, 60, 105]:
        d = tmp_path / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")

    result = discover_checkpoints(tmp_path, filter_items=[60, 105])
    assert [r.name for r in result] == ["checkpoint-60", "checkpoint-105"]


def test_discover_checkpoints_filter_mixed(tmp_path):
    """Filter accepts a mix of names and numbers; unknown entries ignored."""
    from autoeval.watcher import discover_checkpoints

    for n in [30, 60, 105]:
        d = tmp_path / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")

    result = discover_checkpoints(
        tmp_path, filter_items=[30, "checkpoint-999", "checkpoint-105"]
    )
    assert [r.name for r in result] == ["checkpoint-30", "checkpoint-105"]


def test_discover_checkpoints_filter_empty_list_excludes_all(tmp_path):
    """Empty filter list returns no checkpoints (distinct from None)."""
    from autoeval.watcher import discover_checkpoints

    d = tmp_path / "checkpoint-30"
    d.mkdir()
    (d / "trainer_state.json").write_text("{}")

    assert discover_checkpoints(tmp_path, filter_items=[]) == []


def test_discover_checkpoints_multiple_dirs(tmp_path):
    """Discover from multiple directories, merged and sorted."""
    from autoeval.watcher import discover_checkpoints

    dir1 = tmp_path / "model_a"
    dir1.mkdir()
    for n in [30, 60]:
        d = dir1 / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")

    dir2 = tmp_path / "model_b"
    dir2.mkdir()
    for n in [45, 90]:
        d = dir2 / f"checkpoint-{n}"
        d.mkdir()
        (d / "trainer_state.json").write_text("{}")

    result = discover_checkpoints([dir1, dir2])
    assert len(result) == 4
    # Sorted by checkpoint number across all dirs
    assert [r.name for r in result] == [
        "checkpoint-30", "checkpoint-45", "checkpoint-60", "checkpoint-90"
    ]
    # Verify they come from different parent dirs
    assert result[0].parent == dir1
    assert result[1].parent == dir2


def _make_run_dir(base: Path, run_id: str, model: str, completed: bool) -> Path:
    """Helper: create a fake easi run directory."""
    run_dir = base / run_id
    run_dir.mkdir(parents=True)
    config = {"cli_options": {"model": model}}
    (run_dir / "config.json").write_text(json.dumps(config))
    if completed:
        (run_dir / "summary.json").write_text("{}")
    return run_dir


def test_scan_completed_runs(tmp_path):
    from autoeval.watcher import scan_completed_runs

    task_dir = tmp_path / "lhpr_vln_unseen_val"
    task_dir.mkdir()

    _make_run_dir(task_dir, "20260409_run1", "/data/checkpoint-30", completed=True)
    _make_run_dir(task_dir, "20260409_run2", "/data/checkpoint-45", completed=True)
    # Not completed — but just created, so it's "in-progress" not "stale"
    _make_run_dir(task_dir, "20260409_run3", "/data/checkpoint-60", completed=False)

    # With threshold=0, everything incomplete is stale
    completed, stale, in_prog = scan_completed_runs(task_dir, stale_threshold=0)
    assert set(completed) == {
        str(Path("/data/checkpoint-30").resolve()),
        str(Path("/data/checkpoint-45").resolve()),
    }
    assert len(stale) == 1
    assert stale[0].name == "20260409_run3"
    assert in_prog == []


def test_scan_completed_runs_in_progress(tmp_path):
    """A recently modified run dir without summary.json is in-progress, not stale."""
    from autoeval.watcher import scan_completed_runs

    task_dir = tmp_path / "task"
    task_dir.mkdir()
    _make_run_dir(task_dir, "run1", "/data/ckpt-30", completed=False)

    # With a large threshold, the just-created dir is in-progress
    completed, stale, in_prog = scan_completed_runs(task_dir, stale_threshold=9999)
    assert len(in_prog) == 1
    assert in_prog[0].name == "run1"
    assert stale == []



def test_scan_completed_runs_empty(tmp_path):
    from autoeval.watcher import scan_completed_runs

    task_dir = tmp_path / "lhpr_vln_unseen_val"
    task_dir.mkdir()
    completed, stale, in_prog = scan_completed_runs(task_dir)
    assert completed == set()
    assert stale == []
    assert in_prog == []


def test_scan_completed_runs_missing_dir(tmp_path):
    from autoeval.watcher import scan_completed_runs

    task_dir = tmp_path / "nonexistent"
    completed, stale, in_prog = scan_completed_runs(task_dir)
    assert completed == set()
    assert stale == []
    assert in_prog == []


def test_build_eval_command():
    from autoeval.watcher import build_eval_command

    cmd = build_eval_command(
        ["easi", "start", "--backend", "vllm"],
        ["task_a", "task_b"],
        "/data/checkpoint-30",
        "/tmp/logs",
    )
    assert cmd == [
        "easi", "start", "--backend", "vllm",
        "--tasks", "task_a,task_b",
        "--model", "/data/checkpoint-30",
        "--output-dir", "/tmp/logs",
    ]


def test_build_eval_command_single_task():
    from autoeval.watcher import build_eval_command

    cmd = build_eval_command(
        ["easi", "start", "--backend", "vllm"],
        ["task_a"],
        "/data/checkpoint-30",
        "/tmp/logs",
    )
    assert cmd == [
        "easi", "start", "--backend", "vllm",
        "--tasks", "task_a",
        "--model", "/data/checkpoint-30",
        "--output-dir", "/tmp/logs",
    ]


def test_find_run_dir(tmp_path):
    from autoeval.watcher import find_run_dir

    task_dir = tmp_path / "lhpr_vln_unseen_val"
    task_dir.mkdir()

    run_dir = task_dir / "20260409_checkpoint-30"
    run_dir.mkdir()
    config = {"cli_options": {"model": "/data/checkpoint-30"}}
    (run_dir / "config.json").write_text(json.dumps(config))
    (run_dir / "summary.json").write_text("{}")

    found = find_run_dir(task_dir, "/data/checkpoint-30")
    assert found == run_dir


def test_find_run_dir_not_found(tmp_path):
    from autoeval.watcher import find_run_dir

    task_dir = tmp_path / "lhpr_vln_unseen_val"
    task_dir.mkdir()
    assert find_run_dir(task_dir, "/data/checkpoint-999") is None


def test_multi_task_pending_detection(tmp_path):
    """A checkpoint is pending if ANY task is missing a completed run."""
    from autoeval.watcher import discover_checkpoints, scan_completed_runs

    # Create 2 checkpoints
    target = tmp_path / "training"
    for n in [30, 45]:
        d = target / f"checkpoint-{n}"
        d.mkdir(parents=True)
        (d / "trainer_state.json").write_text("{}")

    output = tmp_path / "logs"

    # task_a: checkpoint-30 completed, checkpoint-45 not
    task_a_dir = output / "task_a"
    task_a_dir.mkdir(parents=True)
    _make_run_dir(task_a_dir, "run_30", str((target / "checkpoint-30").resolve()), completed=True)

    # task_b: neither completed
    task_b_dir = output / "task_b"
    task_b_dir.mkdir(parents=True)

    checkpoints = discover_checkpoints(target)
    assert len(checkpoints) == 2

    completed_a, _, _ = scan_completed_runs(task_a_dir, stale_threshold=0)
    completed_b, _, _ = scan_completed_runs(task_b_dir, stale_threshold=0)

    # checkpoint-30: task_a done, task_b missing → pending tasks = [task_b]
    ckpt30_resolved = str(checkpoints[0].resolve())
    missing_30 = []
    for tn, completed in [("task_a", completed_a), ("task_b", completed_b)]:
        if ckpt30_resolved not in completed:
            missing_30.append(tn)
    assert missing_30 == ["task_b"]

    # checkpoint-45: both missing → pending tasks = [task_a, task_b]
    ckpt45_resolved = str(checkpoints[1].resolve())
    missing_45 = []
    for tn, completed in [("task_a", completed_a), ("task_b", completed_b)]:
        if ckpt45_resolved not in completed:
            missing_45.append(tn)
    assert missing_45 == ["task_a", "task_b"]


def _make_fake_run(tmp_path, name="src_run"):
    """Create a fake run dir with top-level files and one episode with PNGs."""
    src = tmp_path / name
    src.mkdir()
    (src / "summary.json").write_text('{"metrics": {}}')
    (src / "config.json").write_text('{"cli_options": {}}')

    ep_dir = src / "episodes" / "000_ep_0"
    ep_dir.mkdir(parents=True)
    (ep_dir / "result.json").write_text('{"success": 0}')
    (ep_dir / "trajectory.jsonl").write_text('{"type": "reset"}\n')
    for i in range(3):
        (ep_dir / f"step_{i:04d}_front.png").write_bytes(b"fake png data")
    return src


def test_move_run_to_results_plain(tmp_path):
    """Move without zipping: episodes dir is moved, stub remains."""
    from autoeval.watcher import _move_run_to_results

    src = _make_fake_run(tmp_path)
    dest = tmp_path / "dest_run"
    _move_run_to_results(src, dest, zip_images=False)

    # Dest has everything
    assert (dest / "summary.json").exists()
    assert (dest / "config.json").exists()
    assert (dest / "episodes" / "000_ep_0" / "result.json").exists()
    assert (dest / "episodes" / "000_ep_0" / "step_0000_front.png").exists()

    # Src stub: top-level files + per-episode metadata, no PNGs
    assert (src / "summary.json").exists()
    assert (src / "config.json").exists()
    assert (src / "episodes" / "000_ep_0" / "result.json").exists()
    assert (src / "episodes" / "000_ep_0" / "trajectory.jsonl").exists()
    assert not list((src / "episodes" / "000_ep_0").glob("*.png"))


def test_move_run_to_results_zip_images(tmp_path):
    """Move with --zip-images: PNGs zipped before moving."""
    from autoeval.watcher import _move_run_to_results
    import zipfile

    src = _make_fake_run(tmp_path)
    dest = tmp_path / "dest_run"
    _move_run_to_results(src, dest, zip_images=True)

    # Dest: JSON files + images.zip, no loose PNGs
    ep_dest = dest / "episodes" / "000_ep_0"
    assert (ep_dest / "result.json").exists()
    assert (ep_dest / "trajectory.jsonl").exists()
    assert (ep_dest / "images.zip").exists()
    assert not list(ep_dest.glob("*.png"))

    # Verify zip contents
    with zipfile.ZipFile(ep_dest / "images.zip") as zf:
        names = sorted(zf.namelist())
        assert names == ["step_0000_front.png", "step_0001_front.png", "step_0002_front.png"]

    # Src stub: metadata only, no PNGs
    assert (src / "summary.json").exists()
    assert (src / "episodes" / "000_ep_0" / "result.json").exists()
    assert not list((src / "episodes" / "000_ep_0").glob("*.png"))
