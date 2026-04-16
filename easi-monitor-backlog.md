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

## Phase 3: Comparison and Analytics
- [ ] Side-by-side episode comparison (two trajectory viewers)
- [ ] 2D map visualization of agent path (using pose data)
- [ ] Aggregate analytics dashboard (token usage trends, timing breakdowns)
- [ ] Run diff view (compare metrics between two runs)

## Phase 4: Multi-Source and Configuration (Complete)
- [x] monitor.yaml config file with named sources
- [x] Hot-reload config on every request (no server restart)
- [x] Multi-source task discovery (separate tasks per source)
- [x] Source labels in UI (badge on task cards, column in recent runs)
- [x] Source path threaded through all API routes, hooks, and pages
- [x] Backwards compatible with EASI_LOGS_DIR env var fallback
- [x] EASI-specific config.json validation for discovery
- [ ] Settings page (/settings) for managing sources from UI (deferred)
- [ ] Export: benchmark TSV download (deferred)
- [ ] Thumbnail generation and caching (deferred)

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
