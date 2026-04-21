#!/usr/bin/env python3
"""Dump the flipped images a mirror prompt builder would send for one episode.

Runs the real ``LHPRVLNMirrorSFTPromptBuilder.build_messages`` call against a
synthesised AgentMemory built from one episode's step images. Writes the
decoded PNGs from every ``image_url`` block (and the original unflipped PNGs
for comparison) into an output directory.

Usage:

    python easi-tools/tools/preview_mirror_episode.py \
        --episode-dir /mnt/umm/users/qianjianheng/workspace/data/lhprvln_dfs_trajgen_easi_data/lhpr_vln_unseen_val_gt_filtered_dfs/<run>/episodes/000_ep_0 \
        --step 0 \
        --out /tmp/mirror_preview

Leave ``--step`` at 0 for the first step; use a larger index to sample deeper
into the trajectory (the step also determines how many past front-view
frames are fed as history).
"""
from __future__ import annotations

import argparse
import base64
import json
import re
from pathlib import Path
from typing import Iterable

from easi.core.episode import Action, Observation
from easi.core.memory import AgentMemory
from easi.tasks.lhpr_vln.prompts.mirror_sft import LHPRVLNMirrorSFTPromptBuilder


_STEP_RE = re.compile(r"^step_(\d{4})_(front|left|right)\.png$")
_ACTION_SPACE = ["move_forward", "turn_left", "turn_right", "stop"]


def _collect_step_images(episode_dir: Path) -> dict[int, dict[str, Path]]:
    """Index episode PNGs as ``{step_idx: {camera: path}}``."""
    steps: dict[int, dict[str, Path]] = {}
    for p in episode_dir.iterdir():
        m = _STEP_RE.match(p.name)
        if not m:
            continue
        idx = int(m.group(1))
        steps.setdefault(idx, {})[m.group(2)] = p
    return steps


def _read_trajectory(episode_dir: Path) -> list[dict]:
    traj_path = episode_dir / "trajectory.jsonl"
    if not traj_path.exists():
        return []
    entries: list[dict] = []
    with traj_path.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entries.append(json.loads(line))
    return entries


def _instruction_from_result(episode_dir: Path) -> str:
    result_path = episode_dir / "result.json"
    if result_path.exists():
        return json.loads(result_path.read_text()).get("instruction", "")
    return ""


def _build_memory(
    episode_dir: Path,
    target_step: int,
    steps_by_idx: dict[int, dict[str, Path]],
    trajectory: list[dict],
) -> AgentMemory:
    """Synthesise AgentMemory mirroring what the agent would see at ``target_step``."""
    cams = steps_by_idx.get(target_step, {})

    def _p(cam: str) -> str | None:
        return str(cams[cam]) if cam in cams else None

    current_obs = Observation(
        rgb_path=_p("front") or "",
        metadata={
            "front_rgb_path": _p("front"),
            "left_rgb_path": _p("left"),
            "right_rgb_path": _p("right"),
        },
    )
    memory = AgentMemory(
        task_description=_instruction_from_result(episode_dir),
        action_space=_ACTION_SPACE,
        current_observation=current_obs,
    )

    # Replay prior steps so the builder's history sampling sees real paths.
    for i in range(target_step):
        prev = steps_by_idx.get(i, {})
        prev_obs = Observation(
            rgb_path=str(prev.get("front") or ""),
            metadata={
                "front_rgb_path": str(prev["front"]) if "front" in prev else None,
                "left_rgb_path": str(prev["left"]) if "left" in prev else None,
                "right_rgb_path": str(prev["right"]) if "right" in prev else None,
            },
        )
        action_name = "move_forward"
        if i < len(trajectory):
            action_name = trajectory[i].get("action") or action_name
        memory.record_step(prev_obs, Action(action_name=action_name), llm_response=None)
    return memory


def _dump_images(
    messages: list[dict],
    raw_cameras: dict[str, Path],
    out_dir: Path,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)

    # Copy originals (unflipped) so the eye can A/B compare.
    for cam, path in raw_cameras.items():
        dest = out_dir / f"original_{cam}.png"
        dest.write_bytes(path.read_bytes())

    img_idx = 0
    history_idx = 0
    current_idx = 0
    phase = "preamble"
    for msg in messages:
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            btype = block.get("type")
            if btype == "text":
                txt = block.get("text", "")
                if "historical pictures" in txt:
                    phase = "history"
                elif "current observations" in txt:
                    phase = "current"
                    current_idx = 0
                elif "Your mission is" in txt:
                    phase = "after"
                continue
            if btype != "image_url":
                continue
            url = block.get("image_url", {}).get("url", "")
            if not url.startswith("data:image/"):
                continue
            _, b64 = url.split(",", 1)
            raw = base64.b64decode(b64)
            if phase == "history":
                name = f"flipped_history_{history_idx:03d}.png"
                history_idx += 1
            elif phase == "current":
                slot = ["left_side", "front_side", "right_side"][current_idx] if current_idx < 3 else f"slot_{current_idx}"
                name = f"flipped_current_{current_idx}_{slot}.png"
                current_idx += 1
            else:
                name = f"flipped_misc_{img_idx}.png"
            (out_dir / name).write_bytes(raw)
            img_idx += 1


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--episode-dir", type=Path, required=True,
                        help="Path to an easi episode dir (contains step_NNNN_*.png).")
    parser.add_argument("--step", type=int, default=0,
                        help="Step index to preview (determines history length).")
    parser.add_argument("--out", type=Path, required=True,
                        help="Output directory for dumped PNGs.")
    parser.add_argument("--window-size", type=int, default=5)
    parser.add_argument("--max-history-images", type=int, default=20)
    args = parser.parse_args(argv)

    steps_by_idx = _collect_step_images(args.episode_dir)
    if args.step not in steps_by_idx:
        raise SystemExit(f"step {args.step} not found under {args.episode_dir}")

    trajectory = _read_trajectory(args.episode_dir)
    memory = _build_memory(args.episode_dir, args.step, steps_by_idx, trajectory)

    builder = LHPRVLNMirrorSFTPromptBuilder(
        window_size=args.window_size,
        max_history_images=args.max_history_images,
    )
    builder.set_action_space(_ACTION_SPACE)
    messages = builder.build_messages(memory)

    # Resolve real paths via symlink so the "original_*" dumps match on-disk.
    raw = {cam: p.resolve() for cam, p in steps_by_idx[args.step].items()}
    _dump_images(messages, raw, args.out)

    print(f"Wrote {len(list(args.out.iterdir()))} file(s) to {args.out}")
    print("Compare each 'original_<cam>.png' against its flipped counterpart:")
    print("  original_left.png   vs  flipped_current_2_right_side.png  (L→R slot)")
    print("  original_front.png  vs  flipped_current_1_front_side.png  (F→F, flipped)")
    print("  original_right.png  vs  flipped_current_0_left_side.png   (R→L slot)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
