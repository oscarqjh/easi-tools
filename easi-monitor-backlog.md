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

## Phase 2: Comparison and Analytics
- [ ] Side-by-side episode comparison (two trajectory viewers)
- [ ] 2D map visualization of agent path (using pose data)
- [ ] Aggregate analytics dashboard (token usage trends, timing breakdowns)
- [ ] Run diff view (compare metrics between two runs)

## Phase 3: Configuration and Polish
- [ ] Multi-directory config file support
- [ ] Export features (episode report, metrics CSV)
- [ ] Real-time monitoring (watch for new runs while app is open)
- [ ] Thumbnail generation and caching
- [ ] URL sharing (deep links to specific episodes/steps)

## Ideas (Unscoped)
- Authentication / multi-user support
- Annotation system (mark interesting steps/episodes with notes)
- Heatmap overlay on frames (attention visualization)
- Action distribution charts per episode
- Failure pattern clustering
