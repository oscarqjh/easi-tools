# tests/test_autoeval_profiles.py
from autoeval.profiles import get_profile


def test_get_profile_unknown_returns_default():
    profile = get_profile("some_unknown_task")
    assert profile.PROFILE_NAME == "default"


def test_get_profile_ebalfred_returns_default():
    """No ebalfred profile yet — falls back to default."""
    profile = get_profile("ebalfred_base")
    assert profile.PROFILE_NAME == "default"


import json
from pathlib import Path


def test_get_profile_lhpr_vln():
    profile = get_profile("lhpr_vln_unseen_val")
    assert profile.PROFILE_NAME == "lhpr_vln"
    assert hasattr(profile, "COLUMNS")
    assert hasattr(profile, "extract_metrics")


def test_get_profile_lhpr_vln_sft():
    profile = get_profile("lhpr_vln_unseen_val_sft")
    assert profile.PROFILE_NAME == "lhpr_vln"


def _make_lhpr_run(tmp_path, model="LHVLN_DFS/checkpoint-30", task_name="lhpr_vln_unseen_val"):
    """Create a minimal fake LHPR-VLN run directory."""
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


def test_lhpr_vln_extract_metrics(tmp_path):
    from autoeval.profiles.lhpr_vln import extract_metrics, COLUMNS

    run_dir = _make_lhpr_run(tmp_path)
    row = extract_metrics(run_dir)

    assert row["Model_Name"] == "LHVLN_DFS/checkpoint-30"
    assert row["Task"] == "lhpr_vln_unseen_val"
    assert row["SR"] == 0.1
    assert row["NE"] == 8.5
    assert row["Avg_Steps"] > 0
    assert row["Max_Steps"] == 200
    assert "Stop_Far" in row
    assert "Early_Stop%" in row
    assert set(row.keys()) == set(COLUMNS)
