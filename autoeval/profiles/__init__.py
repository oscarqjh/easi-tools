"""Benchmark profile registry.

Maps task name prefixes to profile modules. Each profile defines:
- PROFILE_NAME: str
- TASK_PREFIXES: list[str]
- COLUMNS: list[str]
- extract_metrics(run_dir: Path) -> dict
"""
from __future__ import annotations

from types import ModuleType

from autoeval.profiles import default, lhpr_vln

_PROFILES: list[ModuleType] = [lhpr_vln]
_DEFAULT = default


def register(profile: ModuleType) -> None:
    """Register a benchmark profile."""
    _PROFILES.append(profile)


def get_profile(task_name: str) -> ModuleType:
    """Return the profile module for a task name.

    Matches by prefix, falls back to default.
    """
    for profile in _PROFILES:
        for prefix in profile.TASK_PREFIXES:
            if task_name.startswith(prefix):
                return profile
    return _DEFAULT
