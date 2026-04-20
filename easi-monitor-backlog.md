# easi-monitor Backlog

## Phase 1: MVP (Complete)
- [x] Design spec
- [x] Project scaffolding (Next.js 16, Tailwind v4, shadcn/ui v4)
- [x] TypeScript types for EASI data schemas
- [x] Data discovery library (scan logs directory)
- [x] API routes (tasks, runs, episodes, trajectory, frame)
- [x] Zip image extraction support
- [x] Dashboard page (task/run selectors, metrics panel)
- [x] Run comparison chart (dynamic metric selection, Recharts)
- [x] Episode list view (default) with filtering and sorting
- [x] Episode card view with thumbnails
- [x] List/card view toggle
- [x] Trajectory viewer page
- [x] Frame viewer with playback controls and scrubber
- [x] Timeline event markers (fallback, subtask completion)
- [x] Multi-camera selector
- [x] Metadata panel (all fields, always visible)
- [x] Collapsible LLM response (code block)
- [x] Prompt reconstruction: DefaultPromptBuilder
- [x] Prompt reconstruction: SFTPromptBuilder
- [x] Frame prefetching and LRU cache
- [ ] Thumbnail generation and caching (deferred)

## Phase 1.5: Design & Polish (Complete)
- [x] DESIGN.md — Obsidian Lab design system
- [x] Obsidian Lab theme: custom color tokens, surfaces, accents
- [x] JetBrains Mono + IBM Plex Sans font integration
- [x] Lucide icons for playback controls, navigation, view toggle
- [x] Blob-based frame cache with debounced prefetch and stale cancellation
- [x] Loading skeleton states for dashboard and trajectory viewer
- [x] Grouped dashboard sections (Run Summary, Episodes) with containers
- [x] Welcome/overview state when no run is selected
- [x] Keyboard shortcuts: arrow keys (step), space (play/pause)
- [x] Step indicator overlay on frame image
- [x] Metadata panel with "Step Details" header bar
- [x] Episode header section label and tighter layout
- [x] Status badges: solid bg, sharp corners, uppercase
- [x] Metric cards with colored left accent borders
- [x] Empty state with icon when filters return 0 results

## Phase 2: Overview-First Homepage (Complete)
- [x] Overview homepage: aggregate stats, task cards, recent runs table (zero clicks to see data)
- [x] New page: /task/[name] — task detail with run list + comparison chart
- [x] New page: /task/[name]/[run] — run detail with metrics + episode list
- [x] New API: /api/overview — aggregate stats across all tasks
- [x] Breadcrumb-based navigation replacing dropdown selectors
- [x] Deep-linkable URLs for every view
- [x] Full model path display (not just checkpoint name)
- [x] Clickable entire row in recent runs table
- [x] EASI-specific config.json validation for task/run discovery

## Phase 3: Top-Down Map Trajectory Overlay (Complete)
Pre-generate HM3D top-down maps offline, then overlay robot trajectory in real-time in easi-monitor.

### Prerequisites
- [x] Top-down maps already generated for all 153 scenes at `dfs_vln_traj_gen/outputs/scene_outputs/`
- [x] Configure `maps_dir` in `monitor.yaml` pointing to existing scene_outputs
- [x] Upload maps to HuggingFace `oscarqjh/LHPR-VLN_easi` repo as `maps.zip`
- [x] Update easi `_base.yaml` zip_files to auto-extract maps on download

### Implementation (easi-monitor, zero habitat-sim dependency)
- [x] API route: `GET /api/map?scene=SCENE_ID&floor=N` serves static top-down PNG
- [x] API route: `GET /api/map?scene=SCENE_ID&meta=true` returns render_params.json + floor_heights.json
- [x] API route: `GET /api/episode-meta` extracts scene ID from dataset JSONL
- [x] Map overlay component: `<canvas>` rendering trajectory on map image
- [x] Coordinate transform (TypeScript, pure math, no dependencies)
- [x] Floor selection: compare agent_pose[1] against floor_heights to pick correct map
- [x] Trajectory rendering: past path (solid cyan), current position (pulsing dot), future path (dotted)
- [x] Sync with frame scrubber: dot moves as user steps through trajectory
- [x] Side-by-side layout: frame and map equal-width squares, shared controls below
- [x] Click-on-map to jump to nearest trajectory step
- [ ] Direction indicator: arrow/triangle at current position based on agent rotation (needs bridge.py rotation data)

### Future enhancements
- [ ] Add target_coord to bridge.py _build_step_info() (expose sim.info["target coord"] as [x,y,z] in trajectory info)
- [ ] Render subtask target positions as star markers on the map (read from info.target_coord per step)
- [ ] Only works for future runs — existing trajectories don't have target coords
- [ ] Target coords come from SceneSimulator.get_coord() which queries Habitat semantic scene mesh at runtime

### Technical notes
- Source: `/mnt/umm/users/qianjianheng/workspace/dfs_vln_traj_gen/`
- Map generation uses habitat_sim orthographic camera looking straight down (-Y), UP=(0,0,-1)
- render_params.json format: `{width, height, ortho_scale, center_x, center_z}`
- floor_heights.json format: `{floor_heights: [0.103, 2.900], num_floors: 2}`
- Map resolution: adaptive 2048-4096px based on scene bounding box
- agent_pose in EASI trajectory.jsonl: `[x, y, z, rx, ry, rz]` — same coordinate system as map generation (confirmed via bridge.py:263-268, position comes directly from habitat_sim agent)
- Rotation in agent_pose is currently `[0,0,0]` (hardcoded in bridge.py) — agent_rotation quaternion is available in sim_info metadata but not exposed yet. Direction arrow may need bridge.py update to include rotation.

## Analysis Features (Complete)
- [x] Group episodes by Scene or Robot on run detail page
- [x] Dataset episodes API for scene/robot metadata enrichment
- [x] Sortable Date and SR columns on task detail runs table

## Phase 3b: Comparison and Analytics (Partial)
- [x] Side-by-side episode comparison page (same episode, different runs)
- [x] Compare entry points: episode list icon + episode viewer button
- [x] Dual timeline markers on compare page (Left/Right labeled)
- [x] Episode navigator: dropdown + prev/next on viewer and compare pages
- [x] Global export job queue with floating panel, auto-download, cross-page persistence
- [ ] Aggregate analytics dashboard (token usage trends, timing breakdowns)
- [ ] Run diff view (compare metrics/outcomes between two runs as a table)

## Phase 4: Multi-Source and Configuration (Complete)
- [x] monitor.yaml config file with named sources
- [x] Hot-reload config on every request (no server restart)
- [x] Multi-source task discovery (separate tasks per source)
- [x] Source labels in UI (badge on task cards, column in recent runs)
- [x] Source path threaded through all API routes, hooks, and pages
- [x] Backwards compatible with EASI_LOGS_DIR env var fallback
- [x] EASI-specific config.json validation for discovery
- [ ] Settings page (/settings) for managing sources from UI (deferred)
- [ ] Export: benchmark TSV download (blocker: TSV lives in autoeval output_dir, not in results source dir — would need to either replicate autoeval post-processing on server side, or add a configurable benchmark_dir to monitor.yaml)
- [ ] Thumbnail generation and caching (deferred)

## Phase 4.5: Video Export (Complete)
- [x] Python export script (`autoeval/export_video.py`): composes observation + map + metadata as MP4
- [x] CLI: `python -m autoeval.export_video --run-dir ... --episode ... -o video.mp4`
- [x] API route: `GET /api/export-video` triggers server-side rendering
- [x] UI: "Export Video" button on episode page with spinner and direct download
- [x] Uses opencv + PIL (available in easi venv, no ffmpeg needed)
- [x] Renders at 5 fps, 1324x512 (frame + map + metadata panels)
- [x] Configurable FPS from UI (3/5/10 selector)
- [x] Progress indicator during export (SSE streaming frame count)
- [ ] Batch export: export all episodes for a run

## Code Review Fixes (Complete)
- [x] Path traversal prevention: `validateSource()` + `sanitizeSegment()` in all API routes
- [x] `fileId` regex validation in export-video POST
- [x] Double-close timeout fix in export-video SSE
- [x] Frame cache debounce bug (hardcoded 150ms → computed debounceMs)
- [x] Map overlay floor filtering for multi-floor scenes
- [x] EpisodeHeader dedup: accepts props to skip redundant API calls
- [x] `timeAgo` extracted to shared utility
- [x] Removed unused TaskSelector and RunSelector components
- [x] `import re` moved to top-level in export_video.py
- [x] Server-side TTL caching: discoverTasks (10s), discoverRuns (10s), discoverEpisodes (30s)
- [x] AdmZip instance caching per zip path (5min TTL)
- [x] Error states in all hooks (useOverview, useRuns, useEpisodes, useTrajectory, useEpisodeMeta)
- [x] Error UI in all pages (red text on API failure instead of infinite loading)
- [ ] Switch to async fs.promises in API routes for better concurrency (deferred)
- [x] Replace hardcoded hex colors with CSS custom properties where possible

## Extensibility (Complete)
- [x] Task-specific config: `monitor.yaml` tasks section keyed by prefix (maps_dir, datasets_dir per-task)
- [x] Episode header success badge: falls back to `result.success` when `task_success` absent
- [x] Metrics panel: auto-generates cards from `summary.metrics` for task-specific metrics
- [x] Timeline legend: dynamic, only shows marker types present in data
- [x] Overview fallback: uses first numeric from `summary.metrics` when `success_rate` absent
- [x] Map overlay: passes task to API for task-specific config resolution
- [ ] Add prompt builder reconstructions for EB-Alfred, EB-Navigation (deferred)
- [ ] Fallback image lookup in export_video.py for non-LHVLN `rgb_path` conventions (deferred)
- [ ] Simulator-type guard on map overlay (only enable for habitat_sim tasks) (deferred)

## Phase 5a: Training-Trajectory GT Import
- [x] Brainstorm + plan conversion pipeline (dfs_vln_traj_gen → easi schema)
- [x] Conversion script `easi-tools/tools/convert_training_trajectories.py`
- [x] Run + validate conversion on `unseen_val_filtered` (55 eps; 26 success, 29 missing)
- [x] Run + validate conversion on `unseen_test_filtered` (114 eps; 63 success, 2 fail, 49 missing)
- [x] Run + validate conversion on `unseen_train_filtered` (414 eps; 218 success, 5 fail, 191 missing)
- [x] Wire monitor.yaml: `DFS GT Trajectories` source + per-task maps_dir override for train
- [x] `/api/episode-meta` + `/api/dataset-episodes` fallback to result.json when benchmark jsonl absent (enables map + scene-group on GT runs)
- [x] `--include-failures` flag for `fail/` trials (marked with `gt_status: "fail"`)
- [x] Placeholder dirs for missing eps (`gt_status: "missing"`) to keep 1:1 index alignment
- [x] Middle-click / Ctrl-click opens new tab on episode list + homepage recent-runs table
- [ ] Show `gt_status: "missing"` eps as a neutral "NO GT" badge instead of red "FAILED" in the episode list
- [ ] Cross-task compare smoke test: baseline eval run ↔ GT side-by-side (manual visual pass)
- [ ] Optional: collapsible + lazy-load per-scene groups on run detail page (defer until train split proves too slow)

## Phase 5: Task Execution
- [ ] Manual task start from UI (POST /api/task/start → spawns easi start subprocess)
- [ ] Task status tracking (PID file, stdout tailing)
- [ ] Task stop from UI (kill subprocess)
- [ ] "New Run" form on task detail page (pre-filled from last run's config)

## Phase 6: Watcher Integration
- [ ] Watcher control panel page (/control-panel)
- [ ] Start/stop/restart autoeval watcher from UI
- [ ] Watcher status display (running/stopped, current checkpoint)
- [ ] autoeval.yaml config editor in UI (read/write)
- [ ] Live watcher log streaming (SSE or websocket)
- [ ] Process management: PID state file, re-attach on restart

## Ideas (Unscoped)
- Authentication / multi-user support
- Real-time monitoring (watch for new runs while app is open)
- Annotation system (mark interesting steps/episodes with notes)
- Heatmap overlay on frames (attention visualization)
- Action distribution charts per episode
- Failure pattern clustering
