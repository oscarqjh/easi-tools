# easi-monitor Changelog

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
