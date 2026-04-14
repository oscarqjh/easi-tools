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

## Phase 2: Comparison and Analytics
- [ ] Side-by-side episode comparison (two trajectory viewers)
- [ ] 2D map visualization of agent path (using pose data)
- [ ] Aggregate analytics dashboard (token usage trends, timing breakdowns)
- [ ] Run diff view (compare metrics between two runs)

## Phase 3: Configuration and Polish
- [ ] Multi-directory config file support
- [ ] Export features (episode report, metrics CSV)
- [ ] Real-time monitoring (watch for new runs while app is open)
- [ ] Keyboard shortcuts for trajectory navigation
- [ ] URL sharing (deep links to specific episodes/steps)

## Ideas (Unscoped)
- Authentication / multi-user support
- Annotation system (mark interesting steps/episodes with notes)
- Heatmap overlay on frames (attention visualization)
- Action distribution charts per episode
- Failure pattern clustering
