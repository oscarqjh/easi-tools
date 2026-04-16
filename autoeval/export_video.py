"""Export an episode visualization as MP4 video.

Composes each frame with: observation image | top-down map with trajectory | metadata text.

Usage:
    python -m autoeval.export_video \
        --run-dir /path/to/logs/task_name/run_id \
        --episode 019_ep_19 \
        --maps-dir /path/to/maps \
        --datasets-dir /path/to/datasets \
        --output video.mp4 \
        --fps 5
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ORTHO_SCALE_FACTOR = 1.632


def load_trajectory(episode_dir: Path) -> list[dict]:
    traj_path = episode_dir / "trajectory.jsonl"
    if not traj_path.exists():
        return []
    steps = []
    for line in traj_path.read_text().strip().split("\n"):
        try:
            steps.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return steps


def load_result(episode_dir: Path) -> dict | None:
    result_path = episode_dir / "result.json"
    if result_path.exists():
        try:
            return json.loads(result_path.read_text())
        except json.JSONDecodeError:
            pass
    return None


def load_map_data(maps_dir: Path, scene_id: str) -> tuple[np.ndarray | None, dict | None, dict | None]:
    """Load top-down map image and metadata for a scene."""
    scene_dir = maps_dir / scene_id
    if not scene_dir.exists():
        return None, None, None

    # Load render params
    rp_path = scene_dir / "render_params.json"
    render_params = json.loads(rp_path.read_text()) if rp_path.exists() else None

    # Load floor heights
    fh_path = scene_dir / "floor_heights.json"
    floor_heights = json.loads(fh_path.read_text()) if fh_path.exists() else None

    # Load floor 1 map image (default)
    map_path = scene_dir / "topdown_rgb_floor_1.png"
    map_img = cv2.imread(str(map_path)) if map_path.exists() else None

    return map_img, render_params, floor_heights


def get_scene_id(run_dir: Path, episode_dir_name: str, datasets_dir: Path | None) -> str | None:
    """Extract scene_id for an episode from the dataset JSONL."""
    config_path = run_dir / "config.json"
    if not config_path.exists() or not datasets_dir:
        return None

    try:
        config = json.loads(config_path.read_text())
    except json.JSONDecodeError:
        return None

    repo_id = config.get("task_config", {}).get("dataset", {}).get("repo_id")
    split = config.get("task_config", {}).get("dataset", {}).get("split")
    if not repo_id or not split:
        return None

    repo_dir = repo_id.replace("/", "_")
    jsonl_path = datasets_dir / repo_dir / "data" / f"{split}.jsonl"
    if not jsonl_path.exists():
        return None

    # Extract index from episode dir name (e.g., "019_ep_19" -> 19)
    import re
    match = re.match(r"^(\d+)_", episode_dir_name)
    if not match:
        return None
    idx = int(match.group(1))

    lines = jsonl_path.read_text().strip().split("\n")
    if idx >= len(lines):
        return None

    try:
        ep_data = json.loads(lines[idx])
        return ep_data.get("scene")
    except (json.JSONDecodeError, IndexError):
        return None


def world_to_pixel(world_x: float, world_z: float, params: dict) -> tuple[int, int]:
    mpp = params["ortho_scale"] / ORTHO_SCALE_FACTOR
    px = int((world_x - params["center_x"]) / mpp + params["width"] / 2)
    py = int((world_z - params["center_z"]) / mpp + params["height"] / 2)
    return px, py


def get_floor(agent_y: float, floor_heights: list[float]) -> int:
    floor = 1
    for i, fh in enumerate(floor_heights):
        if agent_y >= fh - 0.5:
            floor = i + 1
    return floor


def render_map_frame(
    map_img: np.ndarray,
    render_params: dict,
    trajectory: list[dict],
    current_step: int,
    target_size: int = 512,
) -> np.ndarray:
    """Render the map with trajectory overlay at a specific step."""
    # Resize map to target size (maintain aspect ratio)
    h, w = map_img.shape[:2]
    scale = target_size / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(map_img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Center on a square canvas
    canvas = np.zeros((target_size, target_size, 3), dtype=np.uint8)
    canvas[:] = (15, 10, 10)  # #0A0A0F in BGR
    ox = (target_size - new_w) // 2
    oy = (target_size - new_h) // 2
    canvas[oy:oy+new_h, ox:ox+new_w] = resized

    # Scale factors for coordinate transform
    sx = new_w / render_params["width"]
    sy = new_h / render_params["height"]

    def to_canvas(world_x: float, world_z: float) -> tuple[int, int]:
        px, py = world_to_pixel(world_x, world_z, render_params)
        return int(ox + px * sx), int(oy + py * sy)

    # Collect trajectory points
    points = []
    for i, step in enumerate(trajectory):
        pose = step.get("agent_pose")
        if pose and len(pose) >= 3:
            cx, cy = to_canvas(pose[0], pose[2])
            points.append((cx, cy, i))

    if not points:
        return canvas

    # Draw past trajectory (solid cyan)
    for i in range(1, len(points)):
        if points[i][2] > current_step:
            break
        pt1 = (points[i-1][0], points[i-1][1])
        pt2 = (points[i][0], points[i][1])
        cv2.line(canvas, pt1, pt2, (170, 212, 0), 2)  # #00D4AA in BGR

    # Draw future trajectory (dotted, dimmer)
    for i in range(1, len(points)):
        if points[i][2] <= current_step:
            continue
        if points[i-1][2] < current_step:
            continue
        pt1 = (points[i-1][0], points[i-1][1])
        pt2 = (points[i][0], points[i][1])
        # Dotted line
        dist = math.sqrt((pt2[0]-pt1[0])**2 + (pt2[1]-pt1[1])**2)
        if dist > 0:
            for t in np.arange(0, 1, 4/max(dist, 1)):
                x = int(pt1[0] + t * (pt2[0]-pt1[0]))
                y = int(pt1[1] + t * (pt2[1]-pt1[1]))
                cv2.circle(canvas, (x, y), 1, (170, 212, 0, 80), -1)

    # Start marker (green)
    if points:
        cv2.circle(canvas, (points[0][0], points[0][1]), 5, (153, 211, 52), -1)  # #34D399

    # Current position (cyan with ring)
    cur_pose = trajectory[current_step].get("agent_pose") if current_step < len(trajectory) else None
    if cur_pose and len(cur_pose) >= 3:
        cx, cy = to_canvas(cur_pose[0], cur_pose[2])
        cv2.circle(canvas, (cx, cy), 7, (170, 212, 0), -1)
        cv2.circle(canvas, (cx, cy), 11, (170, 212, 0), 2)

    return canvas


def render_metadata_panel(
    step: dict,
    result: dict | None,
    current_step: int,
    total_steps: int,
    panel_width: int = 300,
    panel_height: int = 512,
) -> np.ndarray:
    """Render metadata text as an image."""
    img = Image.new("RGB", (panel_width, panel_height), color=(10, 10, 15))  # #0A0A0F
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=14)
    font_sm = ImageFont.load_default(size=12)
    font_lg = ImageFont.load_default(size=18)

    y = 10
    cyan = (0, 212, 170)  # #00D4AA
    white = (226, 232, 240)  # #E2E8F0
    muted = (148, 163, 184)  # #94A3B8
    dim = (100, 116, 139)  # #64748B

    # Step counter
    draw.text((10, y), f"Step {current_step} / {total_steps - 1}", fill=cyan, font=font_lg)
    y += 30

    # Instruction (if available)
    if result and result.get("instruction"):
        draw.text((10, y), "INSTRUCTION", fill=dim, font=font_sm)
        y += 16
        instruction = result["instruction"]
        # Word wrap at panel width
        words = instruction.split()
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font_sm)
            if bbox[2] > panel_width - 20:
                draw.text((10, y), line, fill=muted, font=font_sm)
                y += 15
                line = word
            else:
                line = test
        if line:
            draw.text((10, y), line, fill=muted, font=font_sm)
            y += 20

    # Divider
    draw.line([(10, y), (panel_width - 10, y)], fill=(28, 28, 40), width=1)
    y += 10

    info = step.get("info", {})

    # Action
    if step.get("action"):
        draw.text((10, y), "ACTION", fill=dim, font=font_sm)
        y += 16
        draw.text((10, y), step["action"], fill=white, font=font)
        y += 22

    # Fallback
    if step.get("triggered_fallback") is not None:
        label = "Yes" if step["triggered_fallback"] else "No"
        color = (248, 113, 113) if step["triggered_fallback"] else white
        draw.text((10, y), "FALLBACK", fill=dim, font=font_sm)
        y += 16
        draw.text((10, y), label, fill=color, font=font)
        y += 22

    # Feedback
    if info.get("feedback") is not None:
        draw.text((10, y), "FEEDBACK", fill=dim, font=font_sm)
        y += 16
        fb = str(info["feedback"])
        # Truncate long feedback
        if len(fb) > 40:
            fb = fb[:37] + "..."
        draw.text((10, y), fb, fill=white, font=font_sm)
        y += 20

    # Subtask
    if info.get("subtask_stage") is not None:
        draw.text((10, y), "SUBTASK", fill=dim, font=font_sm)
        y += 16
        draw.text((10, y), f"Stage {info['subtask_stage']} / {info.get('subtask_total', '?')}", fill=white, font=font)
        y += 22

    # Distance
    if info.get("current_geo_distance") is not None:
        draw.text((10, y), "GEO DISTANCE", fill=dim, font=font_sm)
        y += 16
        draw.text((10, y), f"{float(info['current_geo_distance']):.2f}m", fill=white, font=font)
        y += 22

    # Pose
    pose = step.get("agent_pose")
    if pose and len(pose) >= 3:
        draw.text((10, y), "POSE", fill=dim, font=font_sm)
        y += 16
        draw.text((10, y), f"x:{pose[0]:.1f}  y:{pose[1]:.1f}  z:{pose[2]:.1f}", fill=muted, font=font_sm)
        y += 20

    # LLM Response (truncated)
    if step.get("llm_response"):
        draw.text((10, y), "LLM RESPONSE", fill=dim, font=font_sm)
        y += 16
        resp = step["llm_response"][:80]
        if len(step["llm_response"]) > 80:
            resp += "..."
        draw.text((10, y), resp, fill=muted, font=font_sm)
        y += 20

    return np.array(img)[:, :, ::-1]  # RGB to BGR for OpenCV


def export_video(
    run_dir: Path,
    episode_dir_name: str,
    output_path: Path,
    maps_dir: Path | None = None,
    datasets_dir: Path | None = None,
    fps: int = 5,
):
    """Export an episode as an MP4 video."""
    episode_dir = run_dir / "episodes" / episode_dir_name

    if not episode_dir.exists():
        print(f"Error: Episode directory not found: {episode_dir}", file=sys.stderr)
        sys.exit(1)

    trajectory = load_trajectory(episode_dir)
    if not trajectory:
        print(f"Error: No trajectory data in {episode_dir}", file=sys.stderr)
        sys.exit(1)

    result = load_result(episode_dir)
    total_steps = len(trajectory)
    print(f"Episode: {episode_dir_name} ({total_steps} steps)")

    # Load map if available
    map_img, render_params, floor_heights = None, None, None
    scene_id = None
    if maps_dir and datasets_dir:
        scene_id = get_scene_id(run_dir, episode_dir_name, datasets_dir)
        if scene_id:
            map_img, render_params, floor_heights = load_map_data(maps_dir, scene_id)
            if map_img is not None:
                print(f"Map loaded: {scene_id} ({map_img.shape[1]}x{map_img.shape[0]})")
            else:
                print(f"No map found for scene: {scene_id}")

    has_map = map_img is not None and render_params is not None

    # Determine video dimensions
    frame_size = 512
    meta_width = 300
    if has_map:
        video_w = frame_size + frame_size + meta_width  # frame + map + metadata
    else:
        video_w = frame_size + meta_width  # frame + metadata
    video_h = frame_size

    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (video_w, video_h))

    if not writer.isOpened():
        print(f"Error: Cannot create video writer for {output_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Rendering {total_steps} frames at {fps} fps → {output_path}")
    print(f"Video size: {video_w}x{video_h}, duration: {total_steps / fps:.1f}s")

    for i, step in enumerate(trajectory):
        # Compose frame
        canvas = np.zeros((video_h, video_w, 3), dtype=np.uint8)
        canvas[:] = (15, 10, 10)  # #0A0A0F

        # 1. Observation image
        rgb_path = step.get("rgb_path")
        if rgb_path:
            img_path = episode_dir / rgb_path
            if img_path.exists():
                obs = cv2.imread(str(img_path))
                if obs is not None:
                    obs = cv2.resize(obs, (frame_size, frame_size))
                    canvas[0:frame_size, 0:frame_size] = obs

        # 2. Map with trajectory overlay
        if has_map:
            map_frame = render_map_frame(map_img, render_params, trajectory, i, frame_size)
            canvas[0:frame_size, frame_size:frame_size*2] = map_frame

        # 3. Metadata panel
        meta_x = frame_size * 2 if has_map else frame_size
        meta_frame = render_metadata_panel(step, result, i, total_steps, meta_width, frame_size)
        canvas[0:frame_size, meta_x:meta_x+meta_width] = meta_frame

        writer.write(canvas)

        if (i + 1) % 100 == 0 or i == total_steps - 1:
            print(f"  [{i+1}/{total_steps}]")

    writer.release()
    print(f"Done: {output_path} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export episode visualization as MP4 video")
    parser.add_argument("--run-dir", required=True, help="Path to run directory (contains config.json, episodes/)")
    parser.add_argument("--episode", required=True, help="Episode directory name (e.g., 019_ep_19)")
    parser.add_argument("--output", "-o", default=None, help="Output video path (default: <episode>.mp4)")
    parser.add_argument("--maps-dir", default=None, help="Directory containing scene top-down maps")
    parser.add_argument("--datasets-dir", default=None, help="Directory containing EASI datasets")
    parser.add_argument("--fps", type=int, default=5, help="Frames per second (default: 5)")
    return parser.parse_args(argv)


def main():
    args = parse_args()
    run_dir = Path(args.run_dir)
    output = Path(args.output) if args.output else Path(f"{args.episode}.mp4")
    maps_dir = Path(args.maps_dir) if args.maps_dir else None
    datasets_dir = Path(args.datasets_dir) if args.datasets_dir else None

    export_video(
        run_dir=run_dir,
        episode_dir_name=args.episode,
        output_path=output,
        maps_dir=maps_dir,
        datasets_dir=datasets_dir,
        fps=args.fps,
    )


if __name__ == "__main__":
    main()
