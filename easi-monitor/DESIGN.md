# easi-monitor Design System — "Obsidian Lab"

> **For AI assistants:** Follow this document for ALL theme, design, color, typography, spacing, and component styling decisions. Do not deviate without explicit user approval.

## Identity

**Obsidian Lab** — a scientific instrument panel aesthetic. Precise, analytical, data-first, zero decoration. Every pixel serves information density. The UI should feel like a well-calibrated lab monitor: dark, sharp, monospace-heavy, with cyan accent that draws the eye exactly where it matters.

## Color Tokens

### Surfaces (4 elevation levels via luminance, NOT shadows)

| Token | Hex | OKLCH | Usage |
|---|---|---|---|
| `surface-base` | `#0A0A0F` | `oklch(0.07 0.01 270)` | Page background |
| `surface-raised` | `#12121A` | `oklch(0.11 0.01 270)` | Cards, panels, table body |
| `surface-overlay` | `#1C1C28` | `oklch(0.15 0.01 270)` | Dropdowns, tooltips, modals |
| `surface-highlight` | `#252535` | `oklch(0.19 0.01 270)` | Hover states, active rows, selected |

Each level increases luminance by ~4%. Surfaces use a subtle blue undertone (hue 270) — never warm gray.

### Text

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#E2E8F0` | Primary content (slate-200) |
| `text-secondary` | `#94A3B8` | Labels, secondary info (slate-400) |
| `text-muted` | `#64748B` | Placeholders, disabled (slate-500) |
| `text-inverse` | `#0A0A0F` | Text on bright badges |

Never use pure white `#FFFFFF` — it creates glare on dark backgrounds. `#E2E8F0` reads as white with less eye strain.

### Accent Palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | Cyan | `#00D4AA` | Brand, active states, primary accent bars, links |
| Success | Green | `#34D399` | Success badges, positive metrics |
| Destructive | Coral | `#F87171` | Error badges, failed episodes |
| Warning | Amber | `#FBBF24` | Early stop, caution states |
| Info | Blue | `#60A5FA` | Informational badges, secondary accent |
| Subtle | Purple | `#A78BFA` | Tertiary accent, optional highlights |

### Accent Usage Rules

- **Metric card left borders:** Each metric gets its own accent color for quick scanning
- **Badges:** Solid background with `text-inverse` for status (FAIL, OK), transparent bg with colored text for info badges
- **Links:** Cyan `#00D4AA` — no underline by default, underline on hover
- **Focus rings:** Cyan `#00D4AA` at 50% opacity
- **Charts:** Use the full accent palette in order: Cyan, Blue, Amber, Coral, Purple

### Data Visualization Palette

For charts, use these colors in order. They are perceptually distinct and accessible:

```
#00D4AA  (cyan)    — primary data series
#60A5FA  (blue)    — secondary
#FBBF24  (amber)   — tertiary
#F87171  (coral)   — quaternary
#A78BFA  (purple)  — quinary
#34D399  (green)   — if 6th needed
```

### Borders

| Token | Value | Usage |
|---|---|---|
| `border-default` | `#1C1C28` (surface-overlay) | Card borders, dividers |
| `border-subtle` | `#14141E` | Faint separation lines |
| `border-accent` | `#00D4AA` at 30% opacity | Active/focused borders |

Use 1px borders. Never use shadows for elevation — use luminance hierarchy.

## Typography

### Font Stack

| Role | Font | Fallback | Weight |
|---|---|---|---|
| Display / Headings | JetBrains Mono | monospace | 700 (bold) |
| Body text | IBM Plex Sans | system-ui, sans-serif | 400, 500 |
| Data / Metrics / Code | JetBrains Mono | monospace | 400, 700 |
| Labels / Headers | IBM Plex Sans | system-ui, sans-serif | 500, uppercase, tracking-wide |

### Loading Fonts

Add to `layout.tsx` or `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
```

### Type Scale

| Element | Size | Weight | Font | Extra |
|---|---|---|---|---|
| Page title (h1) | 18px | 700 | JetBrains Mono | — |
| Section header | 14px | 700 | JetBrains Mono | uppercase, tracking-widest |
| Card title/label | 11px | 500 | IBM Plex Sans | uppercase, tracking-wider, text-muted |
| Metric value | 24px | 700 | JetBrains Mono | — |
| Body text | 14px | 400 | IBM Plex Sans | — |
| Table header | 10px | 500 | IBM Plex Sans | uppercase, tracking-widest, text-muted |
| Table cell | 12px | 400 | IBM Plex Sans / JetBrains Mono | Mono for IDs/numbers |
| Small / Caption | 11px | 400 | IBM Plex Sans | text-secondary |

### Type Rules

- Headings and section labels: **always uppercase with letter-spacing**
- Numeric data (steps, tokens, metrics): **always JetBrains Mono**
- Episode IDs, model paths, actions: **always JetBrains Mono**
- Instruction text, descriptions: **always IBM Plex Sans**
- Never mix fonts within a single data cell

## Spacing

### Scale

Use Tailwind's default spacing scale. Preferred values:

| Token | Value | Usage |
|---|---|---|
| `gap-xs` | 4px (`gap-1`) | Inside badges, tight groups |
| `gap-sm` | 8px (`gap-2`) | Between related items (icon + label) |
| `gap-md` | 12px (`gap-3`) | Between controls |
| `gap-lg` | 16px (`gap-4`) | Between cards, table rows padding |
| `gap-xl` | 24px (`gap-6`) | Between major sections |
| `gap-2xl` | 32px (`gap-8`) | Top-level page sections |

### Component Padding

| Component | Padding |
|---|---|
| Page container | `px-6 py-8` |
| Card | `p-3` (compact) or `p-4` (standard) |
| Table cell | `px-4 py-2` |
| Badge | `px-2 py-0.5` |
| Button | `px-3 py-1.5` (sm) |
| Header | `px-6 py-4` |

## Component Patterns

### Metric Cards

```
┌─────────────────────────┐
│▌ METRIC LABEL           │  ← 2px left accent border, label uppercase muted
│▌ 73.2%                  │  ← JetBrains Mono, 24px, bold
└─────────────────────────┘
```

- Background: `surface-raised`
- Border: 1px `border-default`, plus 2px left accent bar (unique color per metric)
- Corner radius: `rounded-sm` (2px)
- No shadow

### Status Badges

- **FAIL / Error:** Solid `#F87171` bg, `text-inverse`
- **OK / Success:** Solid `#34D399` bg, `text-inverse`
- **Early Stop:** Solid `#FBBF24` bg, `text-inverse`
- **Info badges:** Transparent bg, colored text, no border
- Corner radius: `rounded-sm` (2px) — NOT pills
- Font: 9-10px, uppercase, bold, tracking-wide

### Tables

- Header: `surface-overlay` bg, uppercase, tracking-widest, text-muted, 10px
- Body rows: alternating `surface-base` / `surface-raised` (very subtle)
- Hover: `surface-highlight`
- Borders: 1px `border-subtle` between rows
- No outer border on table — let the card/container handle it
- Corner radius: `rounded-sm` on container

### Buttons

- Primary: Cyan bg `#00D4AA`, `text-inverse`, `rounded-sm`
- Secondary/Outline: 1px border `border-default`, `text-secondary`, `rounded-sm`
- Ghost: No border, `text-secondary`, hover `surface-highlight`
- Icon buttons: Same as outline but square
- All buttons: No shadow, sharp corners

### Charts

- Background: transparent (inherits card bg)
- Grid lines: `border-subtle` at 20% opacity
- Axis labels: IBM Plex Sans, 11px, `text-muted`
- Bar radius: `rounded-sm` (2px top corners only)
- Tooltip: `surface-overlay` bg, 1px border, `rounded-sm`

### Scrubber / Slider

- Track: `surface-overlay`
- Fill: Cyan `#00D4AA`
- Thumb: Cyan `#00D4AA`, 12px, no shadow
- Sharp/minimal design

### Timeline Markers

- Bar height: 4px, bg `surface-overlay`
- Markers: 6px wide, full bar height
- Fallback: `#F87171` (coral)
- Subtask complete: `#34D399` (green)
- Episode end: `#60A5FA` (blue)
- Hover: scale 1.5x

## Layout Rules

### Global

- Max content width: `max-w-7xl` (1280px)
- Page bg: `surface-base`
- Header: `surface-raised` bg, 1px bottom border

### Dashboard

- Selectors: labeled, stacked on mobile (`flex-col sm:flex-row`)
- Metrics: responsive grid `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
- Episodes: list view default, card view toggle

### Trajectory Viewer

- Split layout: 3:2 ratio (frame viewer : metadata panel)
- Breakpoint: `md:` (768px) for two-column
- Metadata panel: responsive height `h-[calc(100vh-300px)]`

## Accessibility

- Minimum contrast ratio: 4.5:1 (WCAG AA) for all text on its background
- `text-primary` (#E2E8F0) on `surface-base` (#0A0A0F): **15.5:1** (passes AAA)
- `text-secondary` (#94A3B8) on `surface-base` (#0A0A0F): **7.8:1** (passes AA)
- `text-muted` (#64748B) on `surface-base` (#0A0A0F): **4.7:1** (passes AA)
- Focus rings: 2px cyan outline at 50% opacity on all interactive elements
- Status colors are distinguishable without relying on color alone (text labels always present)

## Anti-Patterns (NEVER do these)

- **No shadows** — use luminance hierarchy for elevation
- **No gradients** — flat surfaces only
- **No rounded-lg or rounded-full** — use `rounded-sm` (2px) everywhere
- **No warm grays** — always cool/blue-tinted
- **No decorative elements** — every pixel serves data
- **No pure white** — max brightness is `#E2E8F0`
- **No pure black** — min darkness is `#0A0A0F`
- **No pill badges** — use `rounded-sm` rectangles
- **No Inter/Roboto** — use JetBrains Mono + IBM Plex Sans
