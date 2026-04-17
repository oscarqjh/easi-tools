"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TrajectoryStep, MapMeta, RenderParams } from "@/types/easi";

interface Props {
  sceneId: string;
  task?: string;
  trajectory: TrajectoryStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

const ORTHO_SCALE_FACTOR = 1.632;

function worldToPixel(worldX: number, worldZ: number, params: RenderParams) {
  const mpp = params.ortho_scale / ORTHO_SCALE_FACTOR;
  return {
    x: (worldX - params.center_x) / mpp + params.width / 2,
    y: (worldZ - params.center_z) / mpp + params.height / 2,
  };
}

function getFloor(agentY: number, floorHeights: number[]): number {
  let floor = 1;
  for (let i = 0; i < floorHeights.length; i++) {
    if (agentY >= floorHeights[i] - 0.5) floor = i + 1;
  }
  return floor;
}

export function MapOverlay({ sceneId, task, trajectory, currentStep, onStepClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [meta, setMeta] = useState<MapMeta | null>(null);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [mapUrl, setMapUrl] = useState<string>("");
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Fetch map metadata on mount / scene change
  useEffect(() => {
    if (!sceneId) return;
    setMeta(null);
    setImgLoaded(false);
    const taskParam = task ? `&task=${encodeURIComponent(task)}` : "";
    fetch(`/api/map?scene=${encodeURIComponent(sceneId)}&meta=true${taskParam}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.render_params) {
          setMeta(data as MapMeta);
        }
      })
      .catch(console.error);
  }, [sceneId, task]);

  // Determine floor from current step's agent_pose
  useEffect(() => {
    if (!meta?.floor_heights?.floor_heights) return;
    const pose = trajectory[currentStep]?.agent_pose;
    if (!pose || pose.length < 3) return;
    const floor = getFloor(pose[1], meta.floor_heights.floor_heights);
    setCurrentFloor(floor);
  }, [currentStep, trajectory, meta]);

  // Update map URL when floor changes
  useEffect(() => {
    if (!sceneId) return;
    const taskQ = task ? `&task=${encodeURIComponent(task)}` : "";
    const url = `/api/map?scene=${encodeURIComponent(sceneId)}&floor=${currentFloor}${taskQ}`;
    setMapUrl(url);
    setImgLoaded(false);
  }, [sceneId, currentFloor]);

  // Preload image
  useEffect(() => {
    if (!mapUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = mapUrl;
  }, [mapUrl]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !meta?.render_params || !imgLoaded || !imgRef.current) return;

    const img = imgRef.current;
    const params = meta.render_params;

    // Size canvas to container
    const rect = container.getBoundingClientRect();
    const canvasW = rect.width;
    const canvasH = rect.height;
    canvas.width = canvasW;
    canvas.height = canvasH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate the area where the image is drawn (object-contain logic)
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = canvasW / canvasH;

    let drawW: number, drawH: number, offsetX: number, offsetY: number;
    if (imgAspect > containerAspect) {
      // Image wider than container — fit to width
      drawW = canvasW;
      drawH = canvasW / imgAspect;
      offsetX = 0;
      offsetY = (canvasH - drawH) / 2;
    } else {
      // Image taller than container — fit to height
      drawH = canvasH;
      drawW = canvasH * imgAspect;
      offsetX = (canvasW - drawW) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Draw the map image
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

    // Scale from map pixels to drawn pixels
    const scaleX = drawW / params.width;
    const scaleY = drawH / params.height;

    // Helper to convert world coords to canvas coords
    const toCanvas = (worldX: number, worldZ: number) => {
      const p = worldToPixel(worldX, worldZ, params);
      return {
        x: offsetX + p.x * scaleX,
        y: offsetY + p.y * scaleY,
      };
    };

    // Collect valid trajectory points, filtered by current floor
    const floorHeights = meta.floor_heights?.floor_heights;
    const points: { x: number; y: number; step: number }[] = [];
    for (let i = 0; i < trajectory.length; i++) {
      const pose = trajectory[i]?.agent_pose;
      if (!pose || pose.length < 3) continue;
      if (floorHeights && getFloor(pose[1], floorHeights) !== currentFloor) continue;
      const c = toCanvas(pose[0], pose[2]);
      points.push({ x: c.x, y: c.y, step: i });
    }

    if (points.length === 0) return;

    // Draw past trajectory (solid line)
    ctx.beginPath();
    ctx.strokeStyle = "#00D4AA80";
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    let started = false;
    for (const pt of points) {
      if (pt.step > currentStep) break;
      if (!started) {
        ctx.moveTo(pt.x, pt.y);
        started = true;
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();

    // Draw future trajectory (dotted)
    ctx.beginPath();
    ctx.strokeStyle = "#00D4AA30";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    started = false;
    for (const pt of points) {
      if (pt.step < currentStep) continue;
      if (!started) {
        ctx.moveTo(pt.x, pt.y);
        started = true;
      } else {
        ctx.lineTo(pt.x, pt.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw start position (green dot)
    if (points.length > 0) {
      const start = points[0];
      ctx.fillStyle = "#34D399";
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw end position (red dot) if episode is done
    const lastStep = trajectory[trajectory.length - 1];
    if (lastStep?.done && points.length > 0) {
      const end = points[points.length - 1];
      ctx.fillStyle = "#F87171";
      ctx.beginPath();
      ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw current position (cyan dot)
    const curPose = trajectory[currentStep]?.agent_pose;
    if (curPose && curPose.length >= 3) {
      const cur = toCanvas(curPose[0], curPose[2]);
      ctx.fillStyle = "#00D4AA";
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring for visibility
      ctx.strokeStyle = "#00D4AA60";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [meta, trajectory, currentStep, currentFloor, imgLoaded]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Redraw on resize
  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    const container = containerRef.current;
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // Handle click on canvas to jump to nearest trajectory point
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !meta?.render_params || !imgRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const params = meta.render_params;
      const img = imgRef.current;

      const canvasW = canvas.width;
      const canvasH = canvas.height;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = canvasW / canvasH;

      let drawW: number, drawH: number, offsetX: number, offsetY: number;
      if (imgAspect > containerAspect) {
        drawW = canvasW;
        drawH = canvasW / imgAspect;
        offsetX = 0;
        offsetY = (canvasH - drawH) / 2;
      } else {
        drawH = canvasH;
        drawW = canvasH * imgAspect;
        offsetX = (canvasW - drawW) / 2;
        offsetY = 0;
      }

      const scaleX = drawW / params.width;
      const scaleY = drawH / params.height;

      let bestDist = Infinity;
      let bestStep = currentStep;

      for (let i = 0; i < trajectory.length; i++) {
        const pose = trajectory[i]?.agent_pose;
        if (!pose || pose.length < 3) continue;
        const p = worldToPixel(pose[0], pose[2], params);
        const cx = offsetX + p.x * scaleX;
        const cy = offsetY + p.y * scaleY;
        const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          bestStep = i;
        }
      }

      // Only jump if click is within 20px of a trajectory point
      if (bestDist < 20) {
        onStepClick(bestStep);
      }
    },
    [meta, trajectory, currentStep, onStepClick]
  );

  if (!meta) {
    return null;
  }

  return (
    <div className="border border-border rounded-sm bg-card overflow-hidden relative">
      <div ref={containerRef} className="relative w-full aspect-square">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onClick={handleCanvasClick}
        />
      </div>
      {/* Floor indicator overlay */}
      {meta.floor_heights && meta.floor_heights.num_floors > 1 && (
        <div className="absolute top-2 left-2 bg-[#0A0A0F]/80 text-[10px] font-mono text-muted-foreground px-2 py-1 rounded-sm">
          Floor {currentFloor} / {meta.floor_heights.num_floors}
        </div>
      )}
    </div>
  );
}
