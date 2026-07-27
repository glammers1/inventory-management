# AppSidebar.vue — contract and skeleton

Reference for the sidebar component. Hand the relevant parts to `vue-expert`; do not paste this file wholesale into a subagent prompt.

## Props and emits

None. The sidebar owns its own collapse state and reads the route directly. Keeping it self-contained avoids threading a `collapsed` prop through `App.vue` into every view.

`App.vue` needs the collapsed flag only to set the grid column width, so expose it through the same composable rather than an emit — see below.

## State: `composables/useSidebar.js`

Module-scope singleton, matching the pattern already used by `useFilters.js`.

```js
import { ref, watch } from 'vue'

const STORAGE_KEY = 'ui.sidebar.collapsed'

// Read synchronously at module load, not in onMounted — reading later would let the
// expanded default paint for one frame before collapsing, which reads as a flicker.
const collapsed = ref(localStorage.getItem(STORAGE_KEY) === 'true')

// Drawer is separate from collapsed: below 1024px the sidebar is an overlay whose
// open/closed state must not persist, or a reload would restore an open drawer.
const drawerOpen = ref(false)

watch(collapsed, (v) => localStorage.setItem(STORAGE_KEY, String(v)))

export function useSidebar() {
  const toggle = () => { collapsed.value = !collapsed.value }
  const openDrawer = () => { drawerOpen.value = true }
  const closeDrawer = () => { drawerOpen.value = false }
  return { collapsed, drawerOpen, toggle, openDrawer, closeDrawer }
}
```

`localStorage` can throw in private-browsing modes on some browsers. Wrap the read and the write in `try/catch` and fall back to the in-memory default — a redesign should not be able to white-screen the app.

## Nav model

Define once, render with `v-for`. Key on `path`, never the index (`CLAUDE.md`, Common Issues #1).

```js
const navItems = [
  { path: '/',          labelKey: 'nav.overview',       icon: 'grid'     },
  { path: '/inventory', labelKey: 'nav.inventory',      icon: 'box'      },
  { path: '/orders',    labelKey: 'nav.orders',         icon: 'clipboard'},
  { path: '/spending',  labelKey: 'nav.finance',        icon: 'wallet'   },
  { path: '/demand',    labelKey: 'nav.demandForecast', icon: 'trending' },
  { path: '/reports',   labelKey: 'nav.reports',        icon: 'chart'    }
]
```

`nav.reports` does not exist yet — add it to `locales/en.js` (`'Reports'`) and `locales/ja.js` (`'レポート'`).

Active matching:

```js
// Exact match for '/' only — a prefix test would mark Overview active on every route.
const isActive = (path) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)
```

## Template skeleton

```vue
<template>
  <aside
    class="sidebar"
    :class="{ 'is-collapsed': collapsed, 'is-open': drawerOpen }"
  >
    <div class="sidebar-brand">
      <span class="brand-mark" aria-hidden="true"><!-- inline SVG logo mark --></span>
      <span v-show="!collapsed" class="brand-text">
        <span class="brand-name">{{ t('nav.companyName') }}</span>
        <span class="brand-sub">{{ t('nav.subtitle') }}</span>
      </span>
    </div>

    <nav class="sidebar-nav" :aria-label="t('nav.subtitle')">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :aria-current="isActive(item.path) ? 'page' : undefined"
        :title="collapsed ? t(item.labelKey) : undefined"
      >
        <span class="nav-icon" aria-hidden="true"><!-- 16px inline SVG --></span>
        <span v-show="!collapsed" class="nav-label">{{ t(item.labelKey) }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <button
        class="collapse-toggle"
        :aria-expanded="!collapsed"
        :aria-label="collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')"
        @click="toggle"
      >
        <span aria-hidden="true"><!-- chevron SVG, rotated when collapsed --></span>
      </button>
      <LanguageSwitcher />
      <ProfileMenu
        @show-profile-details="$emit('show-profile-details')"
        @show-tasks="$emit('show-tasks')"
      />
    </div>
  </aside>
</template>
```

`ProfileMenu`'s two events currently land on `App.vue`, which owns the modal flags. Moving `ProfileMenu` into the sidebar means re-emitting them upward — the one place this component does emit.

Two new i18n keys: `nav.expandSidebar`, `nav.collapseSidebar`.

## Icons

Six 16px line icons, inline SVG. No emoji, no icon library.

```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round">
  <!-- paths -->
</svg>
```

`stroke="currentColor"` lets the active and hover colors flow from the link's `color`, so icon state needs no extra CSS.

## Styling notes

- Scope every selector under `.sidebar`. `App.vue`'s style block is global and will leak into all six views otherwise.
- Collapsed width transition: animate `width`, not `transform`, so the grid column tracks it. `transition: width .18s ease`.
- `v-show` rather than `v-if` on the labels — they toggle constantly, and keeping them in the DOM avoids re-mounting on every collapse.
- Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible` for both links and the toggle. The app currently has no visible focus styling at all.
- Active item: `background: var(--accent-bg); color: var(--accent)`. Drop the `::after` underline bar from the old top nav — it reads as a tab affordance, wrong for a vertical list.

## Drawer behavior below 1024px

```css
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-w);
    transform: translateX(-100%);
    transition: transform .2s ease;
    z-index: 200;
  }
  .sidebar.is-open { transform: translateX(0); }
}
```

- Backdrop at `z-index: 190`, click closes.
- `Esc` closes — bind on the drawer, not `window`, and clean up on unmount.
- Lock body scroll while open; restore the prior `overflow` value rather than hardcoding `auto`, or you will clobber a modal that locked it first.
- Return focus to the hamburger on close.
- The collapse toggle is meaningless in drawer mode — hide it below the breakpoint.
