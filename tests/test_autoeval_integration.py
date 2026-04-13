"""Integration test: full scan -> pipeline cycle with mocked subprocess."""
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

from autoeval.watcher import (
    discover_checkpoints,
    scan_completed_runs,
    run_pipeline,
)


def _mock_popen(side_effect):
    """Create a mock Popen that runs side_effect on construction and returns rc=0 on wait()."""
    def fake_popen(cmd, **kwargs):
        side_effect(cmd, **kwargs)
        mock_proc = MagicMock()
        mock_proc.wait.return_value = 0
        mock_proc.poll.return_value = 0
        mock_proc.pid = 99999
        return mock_proc
    return fake_popen


def _setup_scenario(tmp_path):
    """Set up a realistic scenario with checkpoints and some completed runs."""
    target = tmp_path / "training_output"
    target.mkdir()
    for n in [30, 45, 60]:
        ckpt = target / f"checkpoint-{n}"
        ckpt.mkdir()
        (ckpt / "trainer_state.json").write_text("{}")
        (ckpt / "config.json").write_text("{}")

    output = tmp_path / "logs"
    task_dir = output / "lhpr_vln_unseen_val"
    task_dir.mkdir(parents=True)
    run_dir = task_dir / "20260409_checkpoint-30"
    run_dir.mkdir()
    config = {"cli_options": {"model": str((target / "checkpoint-30").resolve())}}
    (run_dir / "config.json").write_text(json.dumps(config))
    (run_dir / "summary.json").write_text(json.dumps({"metrics": {"base": {"SR": 0}}}))

    return target, output, task_dir


def test_full_scan_cycle(tmp_path):
    """Discover -> match -> pending gives correct checkpoints."""
    target, output, task_dir = _setup_scenario(tmp_path)

    checkpoints = discover_checkpoints(target)
    assert len(checkpoints) == 3

    completed, stale, _ = scan_completed_runs(task_dir, stale_threshold=0)
    assert len(completed) == 1
    assert len(stale) == 0

    pending = [c for c in checkpoints if str(c.resolve()) not in completed]
    assert len(pending) == 2
    assert pending[0].name == "checkpoint-45"
    assert pending[1].name == "checkpoint-60"


def test_stale_run_detected(tmp_path):
    """A run dir without summary.json is detected as stale."""
    target, output, task_dir = _setup_scenario(tmp_path)

    stale_run = task_dir / "20260409_checkpoint-45"
    stale_run.mkdir()
    config = {"cli_options": {"model": str((target / "checkpoint-45").resolve())}}
    (stale_run / "config.json").write_text(json.dumps(config))

    completed, stale, _ = scan_completed_runs(task_dir, stale_threshold=0)
    assert len(stale) == 1
    assert stale[0].name == "20260409_checkpoint-45"


def _make_fake_run(task_dir, ckpt, task_name):
    """Helper: create fake easi output for one task."""
    def create(cmd, **kwargs):
        run_dir = task_dir / "20260409_run"
        run_dir.mkdir(parents=True, exist_ok=True)
        config = {"cli_options": {"model": str(ckpt.resolve()), "task_name": task_name}}
        (run_dir / "config.json").write_text(json.dumps(config))
        summary = {
            "num_episodes": 1,
            "metrics": {"base": {"SR": 0, "OSR": 0, "SPL": 0, "NE": 5.0,
                                  "ISR": 0, "CSR": 0, "CGT": 0, "TAR": 0}},
            "success_rate": 0, "avg_steps": 50, "median_steps": 50,
        }
        (run_dir / "summary.json").write_text(json.dumps(summary))
        ep_dir = run_dir / "episodes" / "000_ep0"
        ep_dir.mkdir(parents=True)
        (ep_dir / "result.json").write_text(json.dumps(
            {"navigation_error": 5.0, "num_steps": 50, "task_success": 0}
        ))
        traj = [
            json.dumps({"type": "reset", "agent_pose": [0, 0, 0, 0, 0, 0]}),
            json.dumps({"type": "step", "action": "move_forward", "agent_pose": [1, 0, 0, 0, 0, 0]}),
            json.dumps({"type": "step", "action": "stop", "info": {"current_geo_distance": 5.0}}),
        ]
        (ep_dir / "trajectory.jsonl").write_text("\n".join(traj) + "\n")
    return create


def test_pipeline_single_task_mock(tmp_path):
    """Run pipeline with single task and mocked subprocess."""
    target = tmp_path / "training"
    ckpt = target / "checkpoint-45"
    ckpt.mkdir(parents=True)

    output_dir = str(tmp_path / "logs")
    task_dir = tmp_path / "logs" / "my_task"
    task_dir.mkdir(parents=True)

    fake = _make_fake_run(task_dir, ckpt, "my_task")

    with patch("autoeval.watcher.subprocess.Popen", side_effect=_mock_popen(fake)):
        success = run_pipeline(
            checkpoint=ckpt,
            easi_cmd_base=["easi", "start", "--backend", "vllm"],
            pending_tasks=["my_task"],
            output_dir=output_dir,
            results_dir=None,
        )

    assert success is True
    # TSV auto-named by profile: my_task -> default profile
    tsv_path = tmp_path / "logs" / "benchmark_default.tsv"
    assert tsv_path.exists()
    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 2  # header + 1 row


def test_pipeline_multi_task_mock(tmp_path):
    """Run pipeline with 2 tasks, verify both get post-processed."""
    target = tmp_path / "training"
    ckpt = target / "checkpoint-30"
    ckpt.mkdir(parents=True)

    output_dir = str(tmp_path / "logs")
    task_a_dir = tmp_path / "logs" / "task_a"
    task_b_dir = tmp_path / "logs" / "task_b"
    task_a_dir.mkdir(parents=True)
    task_b_dir.mkdir(parents=True)
    results_dir = tmp_path / "results"

    def fake_both(cmd, **kwargs):
        _make_fake_run(task_a_dir, ckpt, "task_a")(cmd)
        _make_fake_run(task_b_dir, ckpt, "task_b")(cmd)

    with patch("autoeval.watcher.subprocess.Popen", side_effect=_mock_popen(fake_both)):
        success = run_pipeline(
            checkpoint=ckpt,
            easi_cmd_base=["easi", "start", "--backend", "vllm"],
            pending_tasks=["task_a", "task_b"],
            output_dir=output_dir,
            results_dir=results_dir,
        )

    assert success is True
    # Both tasks use default profile -> same TSV
    tsv_path = tmp_path / "logs" / "benchmark_default.tsv"
    assert tsv_path.exists()
    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 3  # header + 2 rows
    assert (results_dir / "task_a" / "20260409_run").exists()
    assert (results_dir / "task_b" / "20260409_run").exists()


def test_pipeline_partial_tasks_mock(tmp_path):
    """Run pipeline with only 1 of 2 tasks pending."""
    target = tmp_path / "training"
    ckpt = target / "checkpoint-30"
    ckpt.mkdir(parents=True)

    output_dir = str(tmp_path / "logs")
    task_b_dir = tmp_path / "logs" / "task_b"
    task_b_dir.mkdir(parents=True)

    def fake_task_b(cmd, **kwargs):
        assert "--tasks" in cmd
        tasks_idx = cmd.index("--tasks")
        assert cmd[tasks_idx + 1] == "task_b"
        _make_fake_run(task_b_dir, ckpt, "task_b")(cmd)

    with patch("autoeval.watcher.subprocess.Popen", side_effect=_mock_popen(fake_task_b)):
        success = run_pipeline(
            checkpoint=ckpt,
            easi_cmd_base=["easi", "start", "--backend", "vllm"],
            pending_tasks=["task_b"],
            output_dir=output_dir,
            results_dir=None,
        )

    assert success is True
    tsv_path = tmp_path / "logs" / "benchmark_default.tsv"
    assert tsv_path.exists()
    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 2  # header + 1 row


def test_pipeline_lhpr_vln_profile_mock(tmp_path):
    """Verify LHPR-VLN tasks write to benchmark_lhpr_vln.tsv."""
    target = tmp_path / "training"
    ckpt = target / "checkpoint-45"
    ckpt.mkdir(parents=True)

    output_dir = str(tmp_path / "logs")
    task_dir = tmp_path / "logs" / "lhpr_vln_unseen_val"
    task_dir.mkdir(parents=True)

    fake = _make_fake_run(task_dir, ckpt, "lhpr_vln_unseen_val")

    with patch("autoeval.watcher.subprocess.Popen", side_effect=_mock_popen(fake)):
        success = run_pipeline(
            checkpoint=ckpt,
            easi_cmd_base=["easi", "start", "--backend", "vllm"],
            pending_tasks=["lhpr_vln_unseen_val"],
            output_dir=output_dir,
            results_dir=None,
        )

    assert success is True
    # LHPR-VLN profile -> benchmark_lhpr_vln.tsv
    tsv_path = tmp_path / "logs" / "benchmark_lhpr_vln.tsv"
    assert tsv_path.exists()
    # Default profile TSV should NOT exist
    assert not (tmp_path / "logs" / "benchmark_default.tsv").exists()
