<template>
  <div
    v-if="drawerOpen"
    class="sidebar-backdrop"
    @click="closeDrawer"
  ></div>

  <aside
    class="sidebar"
    :class="{ 'is-collapsed': rail, 'is-open': drawerOpen }"
  >
    <div class="sidebar-brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2l8.5 4.9v9.8L12 21.6 3.5 16.7V6.9L12 2z" />
          <path d="M12 11.3l8.5-4.4M12 11.3v10.3M12 11.3L3.5 6.9" />
        </svg>
      </span>
      <span v-show="!rail" class="brand-text">
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
        :aria-label="t(item.labelKey)"
        :title="rail ? t(item.labelKey) : null"
        @click="closeDrawer"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path v-for="d in item.paths" :key="d" :d="d" />
        </svg>
        <span v-show="!rail" class="nav-label">{{ t(item.labelKey) }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-utils">
        <LanguageSwitcher v-show="!rail" />
        <ProfileMenu
          @show-profile-details="$emit('show-profile-details')"
          @show-tasks="$emit('show-tasks')"
        />
      </div>

      <button
        class="collapse-toggle"
        :aria-expanded="!rail"
        :aria-label="rail ? t('nav.expandSidebar') : t('nav.collapseSidebar')"
        @click="toggle"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span v-show="!rail" class="collapse-label">{{ t('nav.collapseSidebar') }}</span>
      </button>
    </div>
  </aside>
</template>

<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebar, DRAWER_BREAKPOINT } from '../composables/useSidebar'
import { useI18n } from '../composables/useI18n'
import LanguageSwitcher from './LanguageSwitcher.vue'
import ProfileMenu from './ProfileMenu.vue'

// Icons are inline SVG path data rather than components or an icon font: the project
// design system bans emoji, and a dependency is out of scope for a restyle. Expressing
// every glyph as plain paths lets one <svg> template render all six.
const navItems = [
  {
    path: '/',
    labelKey: 'nav.overview',
    paths: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']
  },
  {
    path: '/inventory',
    labelKey: 'nav.inventory',
    paths: ['M21 8l-9-5-9 5v8l9 5 9-5V8z', 'M3 8l9 5 9-5', 'M12 13v8']
  },
  {
    path: '/orders',
    labelKey: 'nav.orders',
    paths: [
      'M9 3h6v3H9z',
      'M8 4.5H6a2 2 0 00-2 2V19a2 2 0 002 2h12a2 2 0 002-2V6.5a2 2 0 00-2-2h-2',
      'M8 11h8',
      'M8 15h5'
    ]
  },
  {
    path: '/spending',
    labelKey: 'nav.finance',
    paths: [
      'M20 12V8.5H6A2.5 2.5 0 016 3.5h11.5',
      'M4 6v12.5A2.5 2.5 0 006.5 21H20v-4',
      'M17.5 12H22v4h-4.5a2 2 0 010-4z'
    ]
  },
  {
    path: '/demand',
    labelKey: 'nav.demandForecast',
    paths: ['M22 7l-8.5 8.5-4-4L2 19', 'M16 7h6v6']
  },
  {
    path: '/reports',
    labelKey: 'nav.reports',
    paths: ['M18 20V10', 'M12 20V4', 'M6 20v-6']
  }
]

export default {
  name: 'AppSidebar',
  components: {
    LanguageSwitcher,
    ProfileMenu
  },
  emits: ['show-profile-details', 'show-tasks'],
  setup() {
    const route = useRoute()
    const { t } = useI18n()
    const { collapsed, drawerOpen, toggle, closeDrawer } = useSidebar()

    // Initialised synchronously so the first paint already knows which mode it is in.
    // There is no SSR here, so `window` is always available during setup().
    const isNarrow = ref(window.matchMedia(DRAWER_BREAKPOINT).matches)

    // "Rail" is the icon-only presentation, which is not the same thing as `collapsed`.
    // Collapsing is a desktop space-saving choice; inside the mobile overlay the drawer
    // is full width, so a stored collapsed=true must not strip its labels.
    const rail = computed(() => collapsed.value && !isNarrow.value)

    // Exact match for '/' only. A prefix test would mark Overview active on every route,
    // since every path starts with a slash.
    const isActive = (path) =>
      path === '/' ? route.path === '/' : route.path.startsWith(path)

    let previousBodyOverflow = ''
    let breakpointQuery = null

    const handleKeydown = (event) => {
      if (event.key === 'Escape' && drawerOpen.value) {
        closeDrawer()
        // Focus belongs back on the control that opened the drawer, which lives in
        // App.vue. Querying by id avoids threading a template ref across components.
        document.getElementById('nav-drawer-toggle')?.focus()
      }
    }

    const handleBreakpointChange = (event) => {
      isNarrow.value = event.matches
      // Crossing back up to desktop leaves drawerOpen stale. CSS stops honouring it, so
      // nothing looks wrong, but the body scroll lock would survive invisibly.
      if (!event.matches) closeDrawer()
    }

    watch(drawerOpen, (open) => {
      if (open) {
        // Capture whatever overflow was already set instead of assuming ''. A detail
        // modal may have locked scrolling first; restoring a hardcoded value on close
        // would silently unlock the page behind it.
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = previousBodyOverflow
      }
    })

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
      breakpointQuery = window.matchMedia(DRAWER_BREAKPOINT)
      breakpointQuery.addEventListener('change', handleBreakpointChange)
    })

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', handleKeydown)
      breakpointQuery?.removeEventListener('change', handleBreakpointChange)
      // Unmounting mid-drawer would otherwise strand the page unscrollable.
      if (drawerOpen.value) document.body.style.overflow = previousBodyOverflow
    })

    return {
      t,
      navItems,
      rail,
      drawerOpen,
      toggle,
      closeDrawer,
      isActive
    }
  }
}
</script>

<style scoped>
.sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-right: 1px solid var(--border);
  height: 100vh;
  position: sticky;
  top: 0;
  z-index: 100;
  overflow: hidden;
  transition: width 0.18s ease;
}

/* ---------- Brand ---------- */

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--header-h);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--accent-bg);
  color: var(--accent);
}

.brand-mark svg {
  width: 18px;
  height: 18px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-name {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.015em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-sub {
  font-size: 0.6875rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Navigation ---------- */

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.nav-item:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.nav-item.active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
}

.nav-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ---------- Footer ---------- */

.sidebar-footer {
  border-top: 1px solid var(--border);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex-shrink: 0;
}

/* Stacked rather than side by side: at 240px the language button and the profile name
   competed for width and the name wrapped onto a second line. */
.sidebar-utils {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  min-width: 0;
}

.sidebar-utils :deep(.profile-name) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.collapse-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.collapse-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.collapse-toggle svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.18s ease;
}

.collapse-label {
  white-space: nowrap;
}

/* ---------- Collapsed rail ---------- */

.sidebar.is-collapsed .sidebar-brand,
.sidebar.is-collapsed .sidebar-nav,
.sidebar.is-collapsed .sidebar-footer {
  padding-left: 0;
  padding-right: 0;
}

.sidebar.is-collapsed .sidebar-brand,
.sidebar.is-collapsed .nav-item,
.sidebar.is-collapsed .collapse-toggle,
.sidebar.is-collapsed .sidebar-utils {
  justify-content: center;
}

.sidebar.is-collapsed .sidebar-utils {
  align-items: center;
}

/* ProfileMenu is a shared child component with no "compact" prop, so the rail hides its
   text parts from the outside rather than forking the component for one caller. */
.sidebar.is-collapsed :deep(.profile-name),
.sidebar.is-collapsed :deep(.chevron) {
  display: none;
}

.sidebar.is-collapsed .collapse-toggle svg {
  transform: rotate(180deg);
}

/* ---------- Mobile drawer ---------- */

.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 190;
}

@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    /* Fixed at the expanded width even when `collapsed` is set: the rail is a
       desktop space-saving affordance and makes no sense inside an overlay. */
    width: var(--sidebar-w);
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 200;
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  /* `rail` already resolves to false at this width, so no is-collapsed overrides are
     needed here — the drawer always renders in its full labelled form.
     Collapsing is meaningless for an overlay, so hide the control entirely. */
  .collapse-toggle {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .collapse-toggle svg {
    transition: none;
  }
}
</style>
