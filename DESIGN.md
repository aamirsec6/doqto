# DOQTO Oncology Board — Design System

Light clinical UI for hospital staff. Readable at a glance on ward tablets.

## Principles
- **Scan first** — KPIs and alerts above the fold
- **Tap to act** — beds and staff status change in one tap
- **Calm, not flashy** — white surfaces, soft borders, red only for urgency

## Color
| Token | Value | Use |
|-------|-------|-----|
| `--board-bg` | `#f4f6f9` | Page background |
| `--board-surface` | `#ffffff` | Cards, panels |
| `--board-border` | `#e2e8f0` | Dividers |
| `--board-text` | `#0f172a` | Primary text |
| `--board-muted` | `#64748b` | Labels, hints |
| `--board-accent` | `#cc0000` | Brand, Code Blue |
| `--board-live` | `#10b981` | Live sync indicator |
| `--board-warn` | `#f59e0b` | Cleaning / reserved |
| `--board-danger` | `#fef2f2` | Open alerts |

## Typography
- **Display:** Instrument Sans — ward names, hospital title
- **Body:** DM Sans — labels, staff names, controls
- **Sizes:** 11px labels (uppercase tracking), 14px body, 18px section titles

## Layout
- Max width 72rem, 16px mobile / 24px desktop padding
- Unit tabs: horizontal scroll on mobile
- Main grid: 8/4 beds vs staff on lg+

## Components
- `.board-card` — white rounded-xl border
- `.board-kpi` — compact metric tile
- `.board-pill` — status badge (available, occupied, free, responding)
