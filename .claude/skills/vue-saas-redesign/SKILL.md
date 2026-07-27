---
name: vue-saas-redesign
description: Redesign this app's UI into a modern SaaS interface — replaces the top nav bar with a collapsible left sidebar, promotes the existing colors and spacing to CSS custom properties, and applies consistent spacing across all views. Use when the user asks to modernize/redesign/restyle the UI, move navigation to a sidebar, make the app "look like a real SaaS product", clean up spacing inconsistencies, or introduce a design token system. Also triggers on "make the UI look professional", "left nav", "vertical navigation", "polish the interface".
---

# Vue 3 SaaS Redesign

Converts this app's horizontal top-nav layout into a sidebar-driven SaaS shell, and replaces ad-hoc CSS values with a token system derived from the colors already in use.

**This is a layout and styling change only.** No API calls, no data shapes, no view logic. If a redesign step seems to require changing what a component *does*, stop and ask.

## Hard constraints

1. **Delegate every `.vue` edit to `vue-expert`.** `CLAUDE.md` makes this mandatory for creating or significantly modifying any `.vue` file. Give the subagent the token table and the specific file's job — not this whole skill.
2. **No emojis in the UI.** Sidebar icons are inline SVG (16px, `stroke="currentColor"`, `stroke-width="1.5"`, `fill="none"`). Never emoji, never an icon font — the project design system forbids it and adding a dependency is out of scope.
3. **Never rename an existing global class.** `.card`, `.stat-card`, `.badge`, `.page-header`, `.stats-grid`, `.table-container`, `.loading`, `.error` are defined unscoped in `App.vue` and consumed across all 6 views and 8 components. Redefine their *internals* with tokens; keep the selectors.
4. **Keep i18n intact.** Nav labels come from `t('nav.*')`. Any new string needs a key in **both** `locales/en.js` and `locales/ja.js`. Japanese labels are longer — verify they don't overflow the sidebar.
5. **Don't touch `server/`.** This is frontend-only.
6. **Comment non-obvious logic** per the Code Conventions section of `CLAUDE.md` — the collapse-persistence and responsive-breakpoint logic both qualify.

## Phase 0 — Survey

Read before changing anything:

- `client/src/App.vue` — the shell. Template lines ~1–55, global `<style>` from ~164 to end.
- `client/src/main.js` — the 6 routes.
- `client/src/components/FilterBar.vue` — sits between header and main today.
- `client/src/locales/en.js` and `ja.js` — the `nav` block.

Confirm the current state still matches this baseline before proceeding:

| Fact | Expected |
|---|---|
| Nav markup | `.top-nav > .nav-container` with `.logo`, `.nav-tabs` (6 `router-link`s), `LanguageSwitcher`, `ProfileMenu` |
| Global styles | Unscoped `<style>` in `App.vue`, ~320 lines |
| Media queries | **Zero** across the whole client — you are adding the first ones |
| Routes | `/`, `/inventory`, `/orders`, `/demand`, `/spending`, `/reports` |
| Nav order (differs from route order) | Overview, Inventory, Orders, Finance, Demand Forecast, Reports |

If the baseline has drifted, re-derive it rather than trusting this table.

## Phase 1 — Design tokens

Extract what the app already uses, promote it to custom properties on `:root` in `App.vue`'s global style block, then replace the literals. **Do not invent a new palette** — these values are the app's identity.

```css
:root {
  /* Surfaces */
  --surface:          #ffffff;
  --surface-sunken:   #f8fafc;   /* body bg, thead */
  --surface-hover:    #f1f5f9;

  /* Borders */
  --border:           #e2e8f0;
  --border-strong:    #cbd5e1;   /* card hover */
  --border-subtle:    #f1f5f9;   /* td top */

  /* Text */
  --text:             #0f172a;   /* headings */
  --text-body:        #1e293b;
  --text-secondary:   #334155;
  --text-tertiary:    #475569;
  --text-muted:       #64748b;

  /* Accent */
  --accent:           #2563eb;
  --accent-bg:        #eff6ff;
  --accent-bg-strong: #dbeafe;

  /* Status — fg / bg / on-bg */
  --success: #059669;  --success-bg: #d1fae5;  --success-fg: #065f46;
  --warning: #ea580c;  --warning-bg: #fed7aa;  --warning-fg: #92400e;
  --danger:  #dc2626;  --danger-bg:  #fecaca;  --danger-fg:  #991b1b;
  --info:    #2563eb;  --info-bg:    #dbeafe;  --info-fg:    #1e40af;

  /* Spacing — 4px scale */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.25rem;  --space-6: 1.5rem;
  --space-8: 2rem;     --space-10: 2.5rem;  --space-12: 3rem;

  /* Type ramp */
  --text-xs: 0.75rem;   --text-sm: 0.875rem;  --text-base: 1rem;
  --text-lg: 1.125rem;  --text-xl: 1.25rem;   --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Radii */
  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 10px;  --radius-full: 999px;

  /* Elevation */
  --shadow-xs: 0 1px 2px 0 rgba(0,0,0,.04);
  --shadow-sm: 0 1px 3px 0 rgba(0,0,0,.05);
  --shadow-md: 0 4px 12px rgba(0,0,0,.06);

  /* Shell */
  --sidebar-w:           240px;
  --sidebar-w-collapsed: 64px;
  --content-max:         1600px;
  --header-h:            64px;
}
```

**Off-scale values to snap.** The current CSS uses `0.375`, `0.625`, `0.813`, `0.875`, `0.938`, and `1.375rem`. Round each to the nearest token:

- `0.938rem` (15px) appears in ~8 places for body text → `--text-sm` (0.875rem). This is the most visible change; it slightly reduces text size app-wide.
- `1.375rem` (logo) → `--text-xl`
- `0.813rem` (subtitle) → `--text-xs`
- `0.375rem` / `0.625rem` padding → `--space-1` or `--space-2` by context

Do the substitution in one pass over the global block, then spot-check the app before moving on. Snapping type sizes is the change most likely to look wrong; if a heading collapses visually, prefer bumping it a step over reintroducing a literal.

## Phase 2 — The sidebar shell

Create `client/src/components/AppSidebar.vue`. Full contract and a markup skeleton are in `reference/sidebar-skeleton.md` — read it before delegating to `vue-expert`.

Behavior summary:

- **Expanded by default**, 240px, full labels. Toggle collapses to a 64px icon rail.
- **Persist** the collapsed flag in `localStorage` under `ui.sidebar.collapsed`. Read it during `setup()` so there's no expand-then-collapse flash on load.
- **Sections**: brand block (company name + subtitle from `t('nav.companyName')` / `t('nav.subtitle')`), the 6 nav links, then a divider, then `LanguageSwitcher` and `ProfileMenu` pinned to the bottom.
- **Active state** from `$route.path`, matching the current `:class="{ active: ... }"` logic. Use exact match for `/` and prefix match for the rest.
- **Collapsed rail** shows icon only; the label becomes a tooltip via `title`. Keep the `aria-label` on the link at all times.

### Layout rework

`.app` currently stacks `header → FilterBar → main` in a column. Replace with a two-column grid:

```css
.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  min-height: 100vh;
}
.app.sidebar-collapsed { grid-template-columns: var(--sidebar-w-collapsed) 1fr; }
```

`FilterBar` moves **inside** the content column, above `<router-view>`. `.main-content` keeps `--content-max` but no longer centers against the viewport — it centers within the content column.

Guard the width transition:

```css
@media (prefers-reduced-motion: reduce) { .app, .sidebar { transition: none; } }
```

### Responsive — you are adding the first breakpoints

Below **1024px** the sidebar becomes an overlay drawer:

- Grid collapses to a single column; sidebar gets `position: fixed` and translates off-canvas.
- A slim top bar appears with a hamburger button — the *only* place a top bar survives.
- Backdrop behind the drawer, `Esc` closes it, body scroll locks while open, focus returns to the hamburger on close.

### z-index — respect the existing stack

Measured values already in the codebase:

| Layer | z-index |
|---|---|
| `Spending.vue` sticky bits | 1 |
| `Orders.vue` sticky header | 10 |
| `FilterBar` | 90 |
| `.top-nav` (being replaced) | 100 |
| `ProfileMenu`, `LanguageSwitcher`, `TasksModal` | 1000 |
| Detail modals (4) | 2000 |

Sidebar takes **100** (the slot the top nav vacates). Mobile drawer **200**, backdrop **190** — both below 1000, so the profile and language dropdowns still render above the drawer that contains them.

## Phase 3 — Global style migration

Rewrite the `App.vue` global block in token terms. Delete `.top-nav`, `.nav-container`, `.nav-tabs`, `.logo`, `.subtitle` once the sidebar replaces them — but only after confirming nothing else references those classes.

Normalize the card family while you're there: `.card` and `.stat-card` currently differ in radius and padding for no reason. Unify on `--radius-lg` and `--space-5`.

## Phase 4 — View sweep

Six views, in ascending size so the pattern is established before the hard one:

`Backlog.vue` (152) → `Orders.vue` (279) → `Inventory.vue` (339) → `Demand.vue` (369) → `Reports.vue` (488) → `Spending.vue` (852) → `Dashboard.vue` (1271)

Per view: replace hardcoded colors and spacing in the scoped block with tokens; align section rhythm to `--space-6` between blocks and `--space-5` inside cards; leave SVG chart geometry alone unless it hardcodes a palette color, in which case swap in the token.

`Backlog.vue` is not routed — style it anyway for consistency, but don't wire it into the sidebar.

## Phase 5 — Verify

Servers: `uv run python main.py` in `server/`, `npm run dev` in `client/`. Use the **Playwright MCP tools** against `http://localhost:3000` per `CLAUDE.md`.

Check every item:

- [ ] All 6 routes load; active state matches the current route on each
- [ ] Collapse toggles, and the state survives a reload
- [ ] No layout shift on first paint (localStorage read before render)
- [ ] Switch to Japanese — no label overflow or wrap in the sidebar at either width
- [ ] Open a detail modal, `TasksModal`, `ProfileMenu`, and `LanguageSwitcher` — each still stacks above the sidebar
- [ ] `FilterBar` still filters; it moved in the DOM, so confirm `useFilters` reactivity is unaffected
- [ ] Resize to 900px and 480px — drawer opens, backdrop works, `Esc` closes, body doesn't scroll behind it
- [ ] Tab through the sidebar — visible focus ring on every link and the toggle
- [ ] `browser_console_messages` is clean
- [ ] `cd tests && uv run pytest backend/ -v` still passes (should be untouched — if it isn't, you changed something you shouldn't have)

## Known traps in this codebase

- **`App.vue`'s style block is global, not scoped.** A careless selector there hits all 6 views. Scope new sidebar styles to `.sidebar` descendants.
- **`Reports.vue` hardcodes `http://localhost:8001`** twice and imports axios directly instead of using `api.js`. Out of scope for a redesign — leave it, but don't be surprised by it.
- **`"Reports"` is hardcoded in the nav**, unlike the other five labels (`App.vue:26`). There is no `nav.reports` key. Add one to both locale files as part of the sidebar work.
- **The nav order differs from the route order.** Preserve the *nav* order: Overview, Inventory, Orders, Finance, Demand, Reports.
- **`.nav-container` has `max-width: 1600px`** and the content uses the same. Once the sidebar owns the left edge, applying both produces an off-center content column — remove it from the shell, keep it on `.main-content`.

## Definition of done

The top nav is gone, every hardcoded color and spacing value in `App.vue`'s global block resolves to a token, all 6 views render correctly at desktop and mobile widths in both locales, and the Phase 5 checklist passes end to end.
