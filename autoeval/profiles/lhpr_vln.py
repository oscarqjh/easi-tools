"""LHPR-VLN benchmark profile."""
from __future__ import annotations

import json
from pathlib import Path

from autoeval.analyze import analyze_trajectory, categorize_failure, load_episodes

PROFILE_NAME = "lhpr_vln"
TASK_PREFIXES = ["lhpr_vln"]

COLUMNS = [
    "Model_Name", "Results_Path", "Task",
    "SR", "OSR", "SPL", "NE", "ISR", "CSR", "CGT", "TAR",
    "Avg_Steps", "Max_Steps",
    "Parse_Error%", "Wall_Collision%", "Early_Stop%",
    "Stop_Far", "Stop_Med", "Stop_Near", "Stop_Close",
]

_METRIC_KEYS = ["SR", "OSR", "SPL", "NE", "ISR", "CSR", "CGT", "TAR"]

_CATEGORY_TO_COLUMN = {
    "stopped_very_far": "Stop_Far",
    "stopped_medium": "Stop_Med",
    "near_miss": "Stop_Near",
    "very_close_miss": "Stop_Close",
}


def extract_metrics(run_dir: Path) -> dict:
    """Extract LHPR-VLN benchmark metrics from a completed run directory."""
    run_dir = Path(run_dir)

    summary = json.loads((run_dir / "summary.json").read_text())
    config = json.loads((run_dir / "config.json").read_text())

    cli = config.get("cli_options", {})
    model_path = cli.get("model") or config.get("model", "unknown")
    task_name = cli.get("task_name", "")
    task_config = config.get("task_config", {})
    max_steps = task_config.get("max_steps", config.get("max_steps", 500))
    sim_configs = task_config.get("simulator_configs", {})
    success_distance = sim_configs.get("success_distance", 1.0)

    metrics = summary.get("metrics", {}).get("base", {})
    if not metrics:
        metrics = summary.get("metrics", summary)

    episodes = load_episodes(run_dir)
    total_parse_failures = 0
    total_wall_hits = 0
    total_forward = 0
    total_llm_steps = 0
    total_early_stops = 0
    step_counts = []
    category_counts = {col: 0 for col in _CATEGORY_TO_COLUMN.values()}

    for ep in episodes:
        ep_dir = Path(ep["_path"])
        traj = analyze_trajectory(ep_dir)

        total_parse_failures += traj["parse_failures"]
        total_wall_hits += traj["wall_hits"]
        total_forward += traj["actions"].get("move_forward", 0)
        total_llm_steps += traj["total_steps"]
        step_counts.append(ep.get("num_steps", traj["total_steps"]))

        if ep.get("forced_early_stop", False):
            total_early_stops += 1

        cat = categorize_failure(ep, traj, max_steps, success_distance)
        col = _CATEGORY_TO_COLUMN.get(cat)
        if col:
            category_counts[col] += 1

    num_eps = len(episodes) or 1
    avg_steps = sum(step_counts) / len(step_counts) if step_counts else 0
    max_step = max(step_counts) if step_counts else 0
    parse_pct = (total_parse_failures / max(total_llm_steps, 1)) * 100
    wall_pct = (total_wall_hits / max(total_forward, 1)) * 100
    early_stop_pct = (total_early_stops / num_eps) * 100

    row = {
        "Model_Name": model_path,
        "Results_Path": str(run_dir.resolve()),
        "Task": task_name,
    }
    for key in _METRIC_KEYS:
        row[key] = metrics.get(key, 0)
    row["Avg_Steps"] = round(avg_steps, 1)
    row["Max_Steps"] = max_step
    row["Parse_Error%"] = round(parse_pct, 1)
    row["Wall_Collision%"] = round(wall_pct, 1)
    row["Early_Stop%"] = round(early_stop_pct, 1)
    for col in _CATEGORY_TO_COLUMN.values():
        row[col] = category_counts[col]

    return row
