# easi-monitor Backlog

## Phase 1: MVP (Current)
- [x] Design spec
- [ ] Project scaffolding (Next.js, Tailwind, shadcn/ui)
- [ ] TypeScript types for EASI data schemas
- [ ] Data discovery library (scan logs directory)
- [ ] API routes (tasks, runs, episodes, trajectory, frame, thumbnails)
- [ ] Zip image extraction support
- [ ] Dashboard page (task/run selectors, metrics panel)
- [ ] Run comparison chart (dynamic metric selection, Recharts)
- [ ] Episode list view (default) with filtering and sorting
- [ ] Episode card view with thumbnails
- [ ] List/card view toggle
- [ ] Trajectory viewer page
- [ ] Frame viewer with playback controls and scrubber
- [ ] Timeline event markers (fallback, subtask completion)
- [ ] Multi-camera selector
- [ ] Metadata panel (all fields, always visible)
- [ ] Collapsible LLM response (code block)
- [ ] Prompt reconstruction: DefaultPromptBuilder
- [ ] Prompt reconstruction: SFTPromptBuilder
- [ ] Frame prefetching and LRU cache
- [ ] Thumbnail generation and caching

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
