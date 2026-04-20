"""YAML config loading and validation for autoeval watcher."""
from __future__ import annotations

import json
from pathlib import Path

import yaml


class ConfigError(Exception):
    """Raised when config file cannot be loaded or is invalid."""
    pass


_DEFAULTS = {
    "target_dirs": [],
    "output_dir": "./logs",
    "results_dir": None,
    "scan_interval": 600,
    "zip_images": False,
    "zip_all_images": False,
    "tasks": [],
    "agent": "react",
    "backend": "vllm",
    "num_parallel": 1,
    "sim_gpus": None,
    "llm_instances": None,
    "llm_gpus": None,
    "llm_kwargs": {},
    "verbosity": None,
    # null / omitted = process every discovered checkpoint.
    # list of names ("checkpoint-1000") or step numbers (1000) = only those.
    "checkpoint_filter": None,
}


def load_config(path: Path) -> dict:
    """Load and validate a YAML config file.

    Missing fields are filled with defaults.
    Raises ConfigError if file is missing or YAML is malformed.
    """
    path = Path(path)
    if not path.exists():
        raise ConfigError(f"Config file not found: {path}")

    try:
        raw = yaml.safe_load(path.read_text())
    except yaml.YAMLError as e:
        raise ConfigError(f"Failed to parse {path}: {e}") from e

    if not isinstance(raw, dict):
        raise ConfigError(f"Config must be a YAML mapping, got {type(raw).__name__}")

    config = dict(_DEFAULTS)
    config.update(raw)

    return config


def build_easi_cmd_base(config: dict) -> list[str]:
    """Build the easi start command base from config fields.

    Does not include --tasks, --model, or --output-dir (added per checkpoint).
    """
    cmd = ["easi", "start"]
    cmd.extend(["--agent", str(config["agent"])])
    cmd.extend(["--backend", str(config["backend"])])
    cmd.extend(["--num-parallel", str(config["num_parallel"])])

    if config.get("sim_gpus"):
        cmd.extend(["--sim-gpus", str(config["sim_gpus"])])
    if config.get("llm_instances"):
        cmd.extend(["--llm-instances", str(config["llm_instances"])])
    if config.get("llm_gpus"):
        cmd.extend(["--llm-gpus", str(config["llm_gpus"])])
    if config.get("llm_kwargs"):
        cmd.extend(["--llm-kwargs", json.dumps(config["llm_kwargs"])])
    if config.get("verbosity"):
        cmd.extend(["--verbosity", str(config["verbosity"])])

    return cmd
