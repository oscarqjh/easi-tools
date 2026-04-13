import json
from pathlib import Path

from autoeval.benchmark import extract_metrics, append_benchmark_row, get_benchmark_tsv_path


def _make_run(tmp_path, model="LHVLN_DFS/checkpoint-30", task_name="lhpr_vln_unseen_val"):
    """Create a minimal fake run directory."""
    run_dir = tmp_path / "run1"
    run_dir.mkdir()

    summary = {
        "num_episodes": 2,
        "metrics": {
            "base": {
                "SR": 0.1, "OSR": 0.2, "SPL": 0.05, "NE": 8.5,
                "ISR": 0.03, "CSR": 0.02, "CGT": 0.01, "TAR": 0.15,
            }
        },
        "model": model,
    }
    (run_dir / "summary.json").write_text(json.dumps(summary))

    config = {
        "cli_options": {"model": model, "task_name": task_name},
        "task_config": {"max_steps": 500, "simulator_configs": {"success_distance": 1.0}},
    }
    (run_dir / "config.json").write_text(json.dumps(config))

    for i, (ne, steps, success) in enumerate([(5.0, 100, 0), (12.0, 200, 0)]):
        ep_dir = run_dir / "episodes" / f"{i:03d}_ep{i}"
        ep_dir.mkdir(parents=True)
        result = {"navigation_error": ne, "num_steps": steps, "task_success": success}
        (ep_dir / "result.json").write_text(json.dumps(result))
        traj_lines = [
            json.dumps({"type": "reset", "agent_pose": [0, 0, 0, 0, 0, 0]}),
            json.dumps({"type": "step", "action": "move_forward", "agent_pose": [1, 0, 0, 0, 0, 0]}),
            json.dumps({"type": "step", "action": "stop", "agent_pose": [1, 0, 0, 0, 0, 0],
                         "info": {"current_geo_distance": ne}}),
        ]
        (ep_dir / "trajectory.jsonl").write_text("\n".join(traj_lines) + "\n")

    return run_dir


def test_extract_metrics_dispatches_to_lhpr_vln(tmp_path):
    run_dir = _make_run(tmp_path)
    profile_name, row = extract_metrics(run_dir)
    assert profile_name == "lhpr_vln"
    assert row["SR"] == 0.1
    assert row["NE"] == 8.5
    assert row["Task"] == "lhpr_vln_unseen_val"


def test_extract_metrics_dispatches_to_default(tmp_path):
    run_dir = _make_run(tmp_path, task_name="some_unknown_task")
    profile_name, row = extract_metrics(run_dir)
    assert profile_name == "default"
    assert row["Task"] == "some_unknown_task"


def test_get_benchmark_tsv_path():
    path = get_benchmark_tsv_path("./logs", "lhpr_vln")
    assert path == Path("./logs/benchmark_lhpr_vln.tsv")


def test_append_benchmark_row_creates_file(tmp_path):
    from autoeval.profiles.lhpr_vln import COLUMNS
    tsv_path = tmp_path / "benchmark.tsv"
    row = {col: "x" for col in COLUMNS}
    row["Results_Path"] = "/tmp/run1"

    append_benchmark_row(tsv_path, row, COLUMNS)
    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 2
    assert lines[0] == "\t".join(COLUMNS)


def test_append_benchmark_row_no_duplicates(tmp_path):
    from autoeval.profiles.lhpr_vln import COLUMNS
    tsv_path = tmp_path / "benchmark.tsv"
    row = {col: "x" for col in COLUMNS}
    row["Results_Path"] = "/tmp/run1"

    append_benchmark_row(tsv_path, row, COLUMNS)
    append_benchmark_row(tsv_path, row, COLUMNS)

    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 2


def test_append_benchmark_row_different_runs(tmp_path):
    from autoeval.profiles.lhpr_vln import COLUMNS
    tsv_path = tmp_path / "benchmark.tsv"
    row1 = {col: "x" for col in COLUMNS}
    row1["Results_Path"] = "/tmp/run1"
    row2 = {col: "y" for col in COLUMNS}
    row2["Results_Path"] = "/tmp/run2"

    append_benchmark_row(tsv_path, row1, COLUMNS)
    append_benchmark_row(tsv_path, row2, COLUMNS)

    lines = tsv_path.read_text().strip().split("\n")
    assert len(lines) == 3
