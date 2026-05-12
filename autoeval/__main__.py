"""autoeval CLI entry point.

Subcommands:
- watch (default): poll for new checkpoints and run the eval pipeline
- repair: reprocess completed runs missing from the benchmark TSV
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from autoeval.config import ConfigError, load_config
from autoeval.watcher import main as watch_main
from autoeval.watcher import run_repair

_DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "autoeval.yaml"


def main() -> None:
    parser = argparse.ArgumentParser(prog="autoeval")
    parser.add_argument(
        "--config", default=str(_DEFAULT_CONFIG),
        help="Path to YAML config file (default: autoeval.yaml)",
    )
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("watch", help="Poll for new checkpoints and run the eval pipeline")

    p_repair = sub.add_parser(
        "repair",
        help="Reprocess completed runs missing from the benchmark TSV",
    )
    p_repair.add_argument(
        "--dry-run", action="store_true",
        help="List runs that would be reprocessed without making changes",
    )
    p_repair.add_argument(
        "--no-move", action="store_true",
        help="Append to TSV only; do not move runs to results_dir",
    )

    args = parser.parse_args()
    config_path = Path(args.config)

    if args.command is None or args.command == "watch":
        watch_main(config_path=config_path)
        return

    if args.command == "repair":
        try:
            config = load_config(config_path)
        except ConfigError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
        run_repair(config, dry_run=args.dry_run, move=not args.no_move)
        return


if __name__ == "__main__":
    main()
