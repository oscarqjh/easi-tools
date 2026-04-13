import json
from pathlib import Path

from autoeval.analyze import analyze_trajectory, categorize_failure


def _write_trajectory(ep_dir: Path, steps: list[dict]) -> None:
    """Write a trajectory.jsonl file from a list of step dicts."""
    ep_dir.mkdir(parents=True, exist_ok=True)
    with open(ep_dir / "trajectory.jsonl", "w") as f:
        for step in steps:
            f.write(json.dumps(step) + "\n")


def test_analyze_empty_trajectory(tmp_path):
    ep_dir = tmp_path / "ep_000"
    ep_dir.mkdir()
    result = analyze_trajectory(ep_dir)
    assert result["total_steps"] == 0
    assert result["actions"] == {}
    assert result["parse_failures"] == 0
    assert result["wall_hits"] == 0


def test_analyze_basic_trajectory(tmp_path):
    ep_dir = tmp_path / "ep_000"
    steps = [
        {"type": "reset", "agent_pose": [0, 0, 0, 0, 0, 0]},
        {"type": "step", "action": "move_forward", "agent_pose": [1, 0, 0, 0, 0, 0], "llm_response": None},
        {"type": "step", "action": "move_forward", "agent_pose": [2, 0, 0, 0, 0, 0], "llm_response": None},
        {"type": "step", "action": "turn_left", "agent_pose": [2, 0, 0, 0, 0, 0], "llm_response": None},
        {"type": "step", "action": "stop", "agent_pose": [2, 0, 0, 0, 0, 0],
         "llm_response": None, "info": {"current_geo_distance": 3.5}},
    ]
    _write_trajectory(ep_dir, steps)
    result = analyze_trajectory(ep_dir)
    assert result["total_steps"] == 4
    assert result["actions"] == {"move_forward": 2, "turn_left": 1, "stop": 1}
    assert result["wall_hits"] == 0
    assert result["stop_distances"] == [3.5]


def test_analyze_wall_hits(tmp_path):
    ep_dir = tmp_path / "ep_000"
    steps = [
        {"type": "reset", "agent_pose": [0, 0, 0, 0, 0, 0]},
        # move_forward but position unchanged = wall hit
        {"type": "step", "action": "move_forward", "agent_pose": [0, 0, 0, 0, 0, 0], "llm_response": None},
        # move_forward with position change = OK
        {"type": "step", "action": "move_forward", "agent_pose": [1, 0, 0, 0, 0, 0], "llm_response": None},
        # another wall hit
        {"type": "step", "action": "move_forward", "agent_pose": [1, 0, 0, 0, 0, 0], "llm_response": None},
    ]
    _write_trajectory(ep_dir, steps)
    result = analyze_trajectory(ep_dir)
    assert result["wall_hits"] == 2


def test_analyze_parse_failures_json_format(tmp_path):
    """Default prompt builder: llm_response is JSON with executable_plan."""
    ep_dir = tmp_path / "ep_000"
    steps = [
        {"type": "reset"},
        # Good response: has executable_plan
        {"type": "step", "action": "move_forward",
         "llm_response": json.dumps({"executable_plan": ["move_forward", "turn_left"]})},
        # Bad response: empty plan
        {"type": "step", "action": "move_forward",
         "llm_response": json.dumps({"executable_plan": []})},
        # Bad response: malformed JSON and no action tokens
        {"type": "step", "action": "move_forward",
         "llm_response": "not json at all {{{"},
    ]
    _write_trajectory(ep_dir, steps)
    result = analyze_trajectory(ep_dir)
    assert result["parse_failures"] == 2


def test_analyze_parse_failures_sft_format(tmp_path):
    """SFT prompt builder: llm_response is raw action tokens, NOT JSON.
    Valid SFT responses should NOT be counted as parse failures."""
    ep_dir = tmp_path / "ep_000"
    steps = [
        {"type": "reset"},
        # Valid SFT response with action tokens
        {"type": "step", "action": "move_forward",
         "llm_response": "<action><|forward|><|forward|><|left|></action>"},
        # Valid SFT response without <action> wrapper (also valid)
        {"type": "step", "action": "turn_left",
         "llm_response": "<|left|><|forward|>"},
        # SFT response with stop token
        {"type": "step", "action": "stop",
         "llm_response": "<action><|stop|></action>"},
        # Garbage response (no JSON, no action tokens) — this IS a parse failure
        {"type": "step", "action": "move_forward",
         "llm_response": "I don't understand the question"},
    ]
    _write_trajectory(ep_dir, steps)
    result = analyze_trajectory(ep_dir)
    assert result["parse_failures"] == 1  # only the garbage response


def test_categorize_success():
    result = {"task_success": 1, "navigation_error": 0.5, "num_steps": 50}
    traj = {"wall_hits": 0}
    assert categorize_failure(result, traj, max_steps=500) == "success"


def test_categorize_stuck_at_wall():
    result = {"task_success": 0, "navigation_error": 8.0, "num_steps": 500}
    traj = {"wall_hits": 300}  # >50% of 500
    assert categorize_failure(result, traj, max_steps=500) == "stuck_at_wall"


def test_categorize_wandering():
    result = {"task_success": 0, "navigation_error": 8.0, "num_steps": 500}
    traj = {"wall_hits": 10}
    assert categorize_failure(result, traj, max_steps=500) == "max_steps_wandering"


def test_categorize_stopped_very_far():
    result = {"task_success": 0, "navigation_error": 15.0, "num_steps": 100}
    traj = {"wall_hits": 0}
    assert categorize_failure(result, traj, max_steps=500) == "stopped_very_far"


def test_categorize_stopped_medium():
    result = {"task_success": 0, "navigation_error": 7.0, "num_steps": 100}
    traj = {"wall_hits": 0}
    # success_distance=1.0, so medium = NE > 5 and <= 10
    assert categorize_failure(result, traj, max_steps=500) == "stopped_medium"


def test_categorize_near_miss():
    result = {"task_success": 0, "navigation_error": 3.0, "num_steps": 100}
    traj = {"wall_hits": 0}
    # NE > 2*1.0 and <= 5*1.0
    assert categorize_failure(result, traj, max_steps=500) == "near_miss"


def test_categorize_very_close_miss():
    result = {"task_success": 0, "navigation_error": 1.5, "num_steps": 100}
    traj = {"wall_hits": 0}
    # NE <= 2*1.0
    assert categorize_failure(result, traj, max_steps=500) == "very_close_miss"
