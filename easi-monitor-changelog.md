# easi-monitor Changelog

## [0.4.0] - 2026-04-16

### Added
- Top-down map trajectory overlay: canvas-based map rendering synced with frame viewer
- Map API routes: `/api/map` (serves map PNGs + metadata) and `/api/episode-meta` (scene ID lookup from dataset)
- Side-by-side layout: frame and map displayed as equal-width squares with shared controls below
- `maps_dir` and `datasets_dir` config fields in `monitor.yaml`
- Coordinate transform (world → pixel) using render_params.json + floor_heights.json
- Floor auto-selection based on agent Y position
- Click-on-map to jump to nearest trajectory step
- Trajectory rendering: past path (solid cyan), future path (dotted), current position (pulsing dot), start (green), end (red)
- `start.sh` startup script for shared storage deployment (uses shared Node.js binary)
- `formatRunLabel()` utility: breadcrumbs show "YYYY-MM-DD HH:MM · last/3/model/segments"
- Speed-adaptive prefetch: scales range with playback speed, biases forward during playback
- `useEpisodeMeta` hook for fetching episode metadata (scene, instruction, etc.)

### Changed
- Frame viewer uses `aspect-square` instead of `aspect-video` (matches 512x512 frame images)
- Prefetch debounce reduced to 30ms during playback (was 150ms always)
- Prefetch range scales to `speed × 15` during playback (was fixed ±15)
- Prefetch bias: 90% forward / 10% back during playback (was symmetric)
- Frame cache increased to 200 entries (was 100)
- Prompt reconstruction uses episode instruction from result.json instead of task config description
- Episode list rows are fully clickable (was link on episode ID only)

### Fixed
- Font ligatures disabled in code blocks (`fontVariantLigatures: none`) — `<|forward|>` no longer renders as triangle arrows
- Breadcrumbs show formatted run label instead of raw directory name or truncated checkpoint name

---

## [0.3.0] - 2026-04-16

### Added
- `monitor.yaml` config file for defining named source directories
- Multi-source discovery: tasks from different sources shown separately with source labels
- Source badges on task cards and source column in recent runs table (only when multiple sources configured)
- `src/lib/config.ts`: hot-reloading config loader (re-reads on every API request, no restart needed)
- Source path parameter threaded through all API routes, hooks, pages, and frame cache
- Overview-first homepage: aggregate stats, task cards, recent runs table (zero clicks to see data)
- Task detail page (`/task/[name]`) with run list and comparison chart
- Run detail page (`/task/[name]/[run]`) with metrics and episode list
- Overview API (`/api/overview`) aggregating across all sources
- Full model path display (not just checkpoint name)
- Clickable entire row in recent runs table
- EASI-specific config.json validation (`run_id` + `cli_options`) for discovery

### Changed
- Replaced `EASI_LOGS_DIR` env var with `monitor.yaml` as primary config (env var still works as fallback)
- All API routes now accept `source` query parameter for multi-source support
- All hooks accept `sourcePath` parameter
- Frame cache keys include source path to avoid cross-source collisions
- Breadcrumb navigation links include source in URL params

---

## [0.2.0] - 2026-04-16

### Added
- DESIGN.md: "Obsidian Lab" design system (color tokens, typography, spacing, component patterns)
- Keyboard shortcuts in trajectory viewer: left/right arrow (step), space (play/pause)
- Step indicator overlay on frame image (N / M badge)
- Skeleton loading states for dashboard metrics, episodes, and trajectory viewer
- Welcome/overview placeholder when no run is selected
- Section grouping: "Select Evaluation", "Run Summary", "Episodes" with bordered containers
- "Step Details" header bar on metadata panel
- "Episode" section label on episode header
- Keyboard shortcuts hint text below frame viewer

### Changed
- Applied Obsidian Lab theme across all components: custom surface colors (#0A0A0F/#12121A/#1C1C28/#252535), cyan primary (#00D4AA), JetBrains Mono + IBM Plex Sans fonts
- Frame cache rewritten: blob-based URLs (zero-latency for cached frames), debounced prefetch (150ms), AbortController for stale cancellation, priority-ordered loading, 100-frame LRU
- All corners changed to rounded-sm (2px) per design system
- Status badges: solid background, sharp corners, uppercase text
- Metric cards: colored left accent borders, uppercase tracking labels
- Chart tooltip: dark themed (#1C1C28 bg)
- Timeline markers: Obsidian Lab accent colors
- Playback controls: lucide icons replace unicode symbols
- Play state lifted to page level for keyboard shortcut integration
- All lucide icons added for navigation, view toggle, filters, playback

### Fixed
- Google Fonts @import ordering in globals.css (must precede Tailwind imports)

---

## [0.1.0] - 2026-04-14

### Added
- Project scaffolding: Next.js 16, Tailwind v4, shadcn/ui v4 (Base UI)
- TypeScript types for all EASI data schemas (config, summary, result, trajectory)
- Data discovery library: scans logs directory for tasks, runs, episodes
- Zip image extraction support (adm-zip)
- API routes: /api/tasks, /api/runs, /api/run, /api/episodes, /api/trajectory, /api/frame
- Dashboard page with task/run selector dropdowns
- Metrics summary panel (episodes, success rate, avg steps, wall clock, tokens)
- Run comparison bar chart with dynamic metric selection (Recharts)
- Episode list view (default) with status badges, filtering, sorting
- Episode card view with first-frame thumbnails
- List/card view toggle
- Trajectory viewer page with frame-by-frame playback
- Playback controls: play/pause, step forward/back, jump to start/end, speed (1x/2x/5x/10x)
- Scrubber slider synchronized with frame display
- Timeline event markers: fallback (red), subtask completion (green), episode end (blue)
- Multi-camera selector
- Metadata panel: action, fallback, feedback, subtask progress, geo distance, pose, reward, done
- Collapsible LLM response display
- Collapsible reconstructed prompt display
- Prompt reconstruction for DefaultPromptBuilder and LHPRVLNSFTPromptBuilder
- Frame prefetching with LRU cache (50 frames, +-10 window)
- EASI_LOGS_DIR environment variable configuration
