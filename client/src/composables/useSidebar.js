import { ref, watch } from 'vue'

const STORAGE_KEY = 'ui.sidebar.collapsed'

// Below this width the sidebar stops being a grid column and becomes an overlay drawer.
// Duplicated in CSS: the JS copy exists because the scroll-lock and Esc handling are only
// correct while the media query actually applies. Keep the two in sync.
export const DRAWER_BREAKPOINT = '(max-width: 1023px)'

// Read synchronously at module load rather than inside onMounted. Reading later would let
// the expanded default paint for one frame before collapsing, which reads as a flicker.
const readStoredCollapsed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    // Private-browsing modes can throw on any localStorage access. Falling back to the
    // default keeps the app rendering — a styling preference is not worth a white screen.
    return false
  }
}

// Shared singleton state, matching the module-scope pattern already used by useFilters.
const collapsed = ref(readStoredCollapsed())

// Deliberately not persisted: restoring an open drawer on reload would drop a returning
// mobile user behind a backdrop with no obvious way out.
const drawerOpen = ref(false)

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Ignore — the toggle still works for this session, it just won't be remembered.
  }
})

export function useSidebar() {
  const toggle = () => {
    collapsed.value = !collapsed.value
  }

  const openDrawer = () => {
    drawerOpen.value = true
  }

  const closeDrawer = () => {
    drawerOpen.value = false
  }

  return {
    collapsed,
    drawerOpen,
    toggle,
    openDrawer,
    closeDrawer
  }
}
