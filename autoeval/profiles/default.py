"""Default benchmark profile — generic metrics from summary.json."""
from __future__ import annotations

import json
from pathlib import Path

PROFILE_NAME = "default"
TASK_PREFIXES: list[str] = []  # never auto-matched, only used as fallback

COLUMNS = [
    "Model_Name", "Results_Path", "Task",
    "Num_Episodes", "Success_Rate", "Avg_Steps", "Median_Steps",
]


def extract_metrics(run_dir: Path) -> dict:
    """Generic extractor: reads summary.json top-level numeric metrics."""
    run_dir = Path(run_dir)
    summary = json.loads((run_dir / "summary.json").read_text())
    config = json.loads((run_dir / "config.json").read_text())

    cli = config.get("cli_options", {})
    model_path = cli.get("model") or config.get("model", "unknown")
    task_name = cli.get("task_name", "")

    row = {
        "Model_Name": model_path,
        "Results_Path": str(run_dir.resolve()),
        "Task": task_name,
        "Num_Episodes": summary.get("num_episodes", 0),
        "Success_Rate": summary.get("success_rate", 0),
        "Avg_Steps": summary.get("avg_steps", 0),
        "Median_Steps": summary.get("median_steps", 0),
    }
    return row
