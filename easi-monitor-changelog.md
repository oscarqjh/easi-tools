# easi-monitor Changelog

## [0.10.0] - 2026-04-19

### Added
- Cross-task compare on `/compare/[task]/[ep]`: accepts `leftTask` / `rightTask` query params for per-side task selection (e.g., baseline vs mirror run)
- Dual task + run dropdowns per side (replaces single run dropdown row)
- `CROSS-TASK` warning badge on breadcrumb when `leftTask !== rightTask`
- Per-side task name label above each metadata panel
- Episode-missing banner: warns when current episode is absent from a selected run and dropdown navigation uses episode-id intersection of both sides
- Instruction fetch falls back to right-side run when left is missing
- Unified refactor: `<SideSelector>` component for dual dropdowns

### Changed
- `FrameViewer` / `MapOverlay` / `useTrajectory` / `useEpisodeMeta` / `useRuns` / `useEpisodes` / `/api/run` calls now use per-side task on the compare page
- `updateRun` / `updateTask` / episode navigation preserve `leftTask` / `rightTask` query params
- Path-based URL `/compare/[task]/[ep]?left=A&right=B` still works: both sides default to the path task when query params are absent

## [0.9.0] - 2026-04-19

### Added
- Side-by-side episode comparison page (`/compare/[task]/[ep]?left=RUN&right=RUN`)
- Compare page: shared scrubber syncs both sides, two full metadata panels, episode header with instruction
- Compare page: dual timeline markers (one row per run, labeled Left/Right)
- Compare entry points: icon on episode list rows + "Compare" button on episode viewer
- Episode navigator: dropdown + prev/next arrows on both viewer and compare pages (e.g., "◀ [ep_23 ▼] ▶ 24/55")
- Global export job queue: floating bottom-right panel tracks exports across page navigation
- Export panel: progress bars, download/retry/dismiss per job, minimizable
- Auto-download when export finishes and user is still on the same episode page
- Manual download via panel when user navigated away

### Changed
- Export logic moved from episode page local state to React context (`ExportProvider` in layout)
- Episode page export button now uses global queue instead of inline SSE handling

---

## [0.8.0] - 2026-04-17

### Added
- Group episodes by Scene or Robot on run detail page (Group toggle: None/Scene/Robot)
- Dataset episodes API (`/api/dataset-episodes`) for fetching scene/robot metadata per episode
- `useDatasetEpisodes` hook for client-side dataset metadata enrichment
- Sortable Date and SR columns on task detail runs table (click header to sort, arrow indicator)
- Per-scene group headers showing episode count and success count

### Fixed
- EpisodeHeader now syncs with async prop updates (was blank when parent fetched data late)

---

## [0.7.0] - 2026-04-17

### Added
- Task-specific config in `monitor.yaml`: `tasks` section keyed by task name prefix (e.g., `lhpr_vln`)
- `getTaskConfig()` helper resolves `maps_dir`/`datasets_dir` per-task instead of globally
- Metrics panel now shows all numeric values from `summary.metrics` as additional cards
- Dynamic timeline legend: only shows marker types that actually appear in the data

### Fixed
- Episode header success badge: falls back to `result.success` when `task_success` is absent (fixes wrong "Failed" badge for EB-Alfred and other tasks)
- Overview max metric: falls back to first numeric value in `summary.metrics` when `success_rate` is absent
- Map overlay passes `task` param to API for task-specific config resolution

### Changed
- Removed global `maps_dir` and `datasets_dir` from `MonitorConfig` — now per-task in `tasks` section
- API routes `/api/map`, `/api/episode-meta`, `/api/export-video` resolve paths via task-specific config

---

## [0.6.0] - 2026-04-17

### Added
- Generic TTL cache (`src/lib/cache.ts`) for server-side in-memory caching
- Error states in all data-fetching hooks (`useOverview`, `useRuns`, `useEpisodes`, `useTrajectory`, `useEpisodeMeta`)
- Error UI in all pages: red text message on API failure instead of infinite loading

### Performance
- `discoverTasks` and `discoverRuns` cached with 10s TTL (avoids re-reading directories on rapid page navigation)
- `discoverEpisodes` cached with 30s TTL (episode data doesn't change once run completes)
- `AdmZip` instances cached per zip path with 5min TTL (avoids re-parsing zip central directory on every frame request)

---

## [0.5.2] - 2026-04-17

### Security
- Path traversal prevention: all API routes validate `source` param against configured sources
- Input sanitization: `task`, `run`, `ep`, `scene` params reject `..`, `/`, `\`, null bytes
- `fileId` in export-video POST validated with regex (`^easi_export_[\w-]+$`)
- Created `src/lib/security.ts` with `validateSource()` and `sanitizeSegment()` shared utilities

### Fixed
- Frame cache debounce bug: `setTimeout` now uses computed `debounceMs` (was hardcoded 150ms, ignoring 30ms during playback)
- Map overlay floor filtering: trajectory points now filtered by current floor (multi-floor scenes no longer show wrong-floor points)
- Double-close timeout in export-video SSE: `clearTimeout` called when process completes normally
- EpisodeHeader no longer makes redundant API calls (accepts config/result as props from parent)
- `import re` moved to top-level in `export_video.py`

### Changed
- `timeAgo` extracted to shared `src/lib/episode-utils.ts` (was duplicated in page.tsx and task page)
- Removed unused components: `TaskSelector`, `RunSelector` (from pre-routing era)

---

## [0.5.1] - 2026-04-16

### Added
- Configurable FPS selector (3/5/10) on episode export button
- SSE-based export progress indicator showing live frame count (e.g., "142/740")

### Changed
- Export API supports `stream=true` mode for real-time progress via Server-Sent Events
- Two-step download flow: SSE stream for progress → POST to fetch completed file

---

## [0.5.0] - 2026-04-16

### Added
- Video export: compose episode visualization as MP4 (observation + map + metadata panels)
- CLI: `python -m autoeval.export_video --run-dir ... --episode ... -o video.mp4`
- UI: "Export Video" button on episode page with spinner and direct download
- API route: `GET /api/export-video` triggers server-side rendering via Python (opencv + PIL)
- Maps uploaded to HuggingFace `oscarqjh/LHPR-VLN_easi` as `maps.zip`
- `maps.zip` added to EASI `_base.yaml` zip_files for auto-extraction on `easi task download`
- Homepage shows max success rate instead of average

### Changed
- `monitor.yaml` maps_dir and datasets_dir point to easi cache default path (`~/.cache/easi/datasets/`)

### Fixed
- EASI CLI `--data-dir` help text corrected (default is `~/.cache/easi/datasets`, not `./datasets`)
- LHPR-VLN bridge: stop feedback uses `sim.successes` flag instead of stale `geo_dis` after stage advance

---

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
