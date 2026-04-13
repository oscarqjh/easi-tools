"""Trajectory analysis for LHPR-VLN evaluation runs.

Reads trajectory.jsonl and result.json files to compute:
- Action distribution, parse failure rates, wall collision rates
- Failure mode categorization (stop distance buckets)
- Step statistics
"""
from __future__ import annotations

import json
import re
from pathlib import Path

# SFT action token pattern — matches <|forward|>, <|left|>, <|right|>, <|stop|>
_ACTION_TOKEN_RE = re.compile(r"<\|(forward|left|right|stop)\|>")


def _is_valid_sft_response(text: str) -> bool:
    """Check if a non-JSON response contains valid SFT action tokens."""
    return bool(_ACTION_TOKEN_RE.search(text))


def analyze_trajectory(ep_dir: Path) -> dict:
    """Analyze a single episode trajectory for failure modes.

    Returns dict with keys: total_steps, actions, parse_failures, wall_hits,
    stop_distances, buffered_stops.
    """
    traj_file = ep_dir / "trajectory.jsonl"
    if not traj_file.exists():
        return {
            "total_steps": 0,
            "actions": {},
            "parse_failures": 0,
            "wall_hits": 0,
            "stop_distances": [],
            "buffered_stops": 0,
        }

    steps = []
    with open(traj_file) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                steps.append(json.loads(line))
            except json.JSONDecodeError:
                continue  # skip corrupted lines

    action_counts: dict[str, int] = {}
    parse_failures = 0
    wall_hits = 0
    stop_distances: list[float] = []
    buffered_stops = 0
    prev_pose = None

    for step in steps:
        if step.get("type") != "step":
            prev_pose = step.get("agent_pose")
            continue

        action = step.get("action", "")
        action_counts[action] = action_counts.get(action, 0) + 1

        llm_resp = step.get("llm_response")

        # Detect parse failure. Two response formats:
        # 1. Default builder: JSON with "executable_plan" list
        # 2. SFT builder: raw action tokens like <|forward|><|left|>
        if llm_resp:
            try:
                parsed = json.loads(llm_resp)
                plan = parsed.get("executable_plan", [])
                if not plan:
                    parse_failures += 1
            except (json.JSONDecodeError, TypeError, AttributeError):
                # Not JSON — check if it's a valid SFT response with action tokens
                if not _is_valid_sft_response(llm_resp):
                    parse_failures += 1

        # Detect wall hit: move_forward with no position change
        curr_pose = step.get("agent_pose")
        if action == "move_forward" and prev_pose and curr_pose:
            if prev_pose[:3] == curr_pose[:3]:
                wall_hits += 1
        prev_pose = curr_pose

        # Track distance when stop is called
        if action == "stop":
            info = step.get("info", {})
            if info:
                geo_dis = info.get("current_geo_distance")
                if geo_dis is not None:
                    stop_distances.append(float(geo_dis))

            # Buffered stop = no LLM call
            if llm_resp is None:
                buffered_stops += 1

    return {
        "total_steps": len([s for s in steps if s.get("type") == "step"]),
        "actions": action_counts,
        "parse_failures": parse_failures,
        "wall_hits": wall_hits,
        "stop_distances": stop_distances,
        "buffered_stops": buffered_stops,
    }


def categorize_failure(
    result: dict, traj: dict, max_steps: int, success_distance: float = 1.0
) -> str:
    """Categorize an episode's failure mode.

    Categories:
    - success: task_success > 0
    - stuck_at_wall: hit max_steps with >50% wall hits
    - max_steps_wandering: hit max_steps without wall-stuck
    - stopped_very_far: NE > 10m
    - stopped_medium: NE > 5*sd and <= 10m
    - near_miss: NE > 2*sd and <= 5*sd
    - very_close_miss: NE <= 2*sd
    """
    if result.get("task_success", 0) > 0:
        return "success"

    nav_error = result.get("navigation_error", 999)
    num_steps = result.get("num_steps", 0)
    sd = success_distance

    if num_steps >= max_steps and traj["wall_hits"] > num_steps * 0.5:
        return "stuck_at_wall"
    if num_steps >= max_steps:
        return "max_steps_wandering"
    if nav_error > 10:
        return "stopped_very_far"
    if nav_error > sd * 5:
        return "stopped_medium"
    if nav_error > sd * 2:
        return "near_miss"
    return "very_close_miss"


def load_episodes(run_dir: Path) -> list[dict]:
    """Load all episode result.json files from a run directory."""
    episodes_dir = run_dir / "episodes"
    if not episodes_dir.is_dir():
        return []

    episodes = []
    for ep_dir in sorted(episodes_dir.iterdir()):
        if not ep_dir.is_dir():
            continue
        result_file = ep_dir / "result.json"
        if not result_file.exists():
            continue
        result = json.loads(result_file.read_text())
        result["_dir"] = ep_dir.name
        result["_path"] = str(ep_dir)
        episodes.append(result)
    return episodes
