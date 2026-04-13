"""Benchmark metrics dispatch and TSV management.

Delegates metrics extraction to the appropriate profile based on task name.
Handles TSV append, duplicate detection, and column migration.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

from autoeval.profiles import get_profile


def extract_metrics(run_dir: Path) -> tuple[str, dict]:
    """Extract metrics using the appropriate profile.

    Reads config.json to determine the task name, selects the matching
    profile, and delegates extraction.

    Returns:
        (profile_name, row_dict) where row_dict keys match the profile's COLUMNS.
    """
    run_dir = Path(run_dir)
    config = json.loads((run_dir / "config.json").read_text())
    task_name = config.get("cli_options", {}).get("task_name", "")

    profile = get_profile(task_name)
    row = profile.extract_metrics(run_dir)

    return profile.PROFILE_NAME, row


def get_benchmark_tsv_path(output_dir: str, profile_name: str) -> Path:
    """Derive the benchmark TSV path from the output dir and profile name."""
    return Path(output_dir) / f"benchmark_{profile_name}.tsv"


def append_benchmark_row(tsv_path: Path, row: dict, columns: list[str]) -> bool:
    """Append a row to the benchmark TSV file.

    Creates the file with header if it doesn't exist.
    Skips if a row with the same Results_Path already exists.
    Migrates old files with fewer columns by rewriting with the new header.

    Returns True if row was appended, False if skipped (duplicate).
    """
    tsv_path = Path(tsv_path)
    tsv_path.parent.mkdir(parents=True, exist_ok=True)

    if tsv_path.exists():
        lines = tsv_path.read_text().strip().split("\n")
        if lines:
            old_header = lines[0].split("\t")
            results_path = str(row.get("Results_Path", ""))

            for line in lines[1:]:
                fields = line.split("\t")
                if len(fields) > 1 and fields[1] == results_path:
                    return False

            if old_header != columns:
                _migrate_tsv(tsv_path, lines, old_header, columns)

    write_header = not tsv_path.exists() or tsv_path.stat().st_size == 0
    with open(tsv_path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, delimiter="\t")
        if write_header:
            writer.writeheader()
        writer.writerow(row)

    return True


def _migrate_tsv(
    tsv_path: Path, lines: list[str], old_header: list[str], new_columns: list[str],
) -> None:
    """Rewrite a TSV file with new columns.

    Preserves existing data, backfilling missing columns with empty strings.
    """
    old_to_idx = {col: i for i, col in enumerate(old_header)}

    with open(tsv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=new_columns, delimiter="\t")
        writer.writeheader()
        for line in lines[1:]:
            fields = line.split("\t")
            row = {}
            for col in new_columns:
                idx = old_to_idx.get(col)
                if idx is not None and idx < len(fields):
                    row[col] = fields[idx]
                else:
                    row[col] = ""
            writer.writerow(row)
