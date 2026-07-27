<template>
  <div class="app" :class="{ 'sidebar-collapsed': collapsed }">
    <AppSidebar
      @show-profile-details="showProfileDetails = true"
      @show-tasks="showTasks = true"
    />

    <div class="content-col">
      <div class="mobile-bar">
        <button
          id="nav-drawer-toggle"
          class="drawer-toggle"
          :aria-label="t('nav.openNavigation')"
          :aria-expanded="drawerOpen"
          @click="openDrawer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span class="mobile-brand">{{ t('nav.companyName') }}</span>
      </div>

      <FilterBar />

      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useSidebar } from './composables/useSidebar'
import AppSidebar from './components/AppSidebar.vue'
import FilterBar from './components/FilterBar.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'

export default {
  name: 'App',
  components: {
    AppSidebar,
    FilterBar,
    ProfileDetailsModal,
    TasksModal
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const { collapsed, drawerOpen, openDrawer } = useSidebar()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      collapsed,
      drawerOpen,
      openDrawer,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
:root {
  /* Surfaces */
  --surface:          #ffffff;
  --surface-sunken:   #f8fafc;
  --surface-hover:    #f1f5f9;

  /* Borders */
  --border:           #e2e8f0;
  --border-strong:    #cbd5e1;
  --border-subtle:    #f1f5f9;

  /* Text */
  --text:             #0f172a;
  --text-body:        #1e293b;
  --text-secondary:   #334155;
  --text-tertiary:    #475569;
  --text-muted:       #64748b;
  --text-placeholder: #94a3b8;

  /* Accent */
  --accent:           #2563eb;
  --accent-hover:     #1d4ed8;
  --accent-light:     #60a5fa;
  --accent-bg:        #eff6ff;
  --accent-bg-strong: #dbeafe;

  /* Status */
  --success: #059669;  --success-bg: #d1fae5;  --success-fg: #065f46;
  --warning: #ea580c;  --warning-bg: #fed7aa;  --warning-fg: #92400e;
  --danger:  #dc2626;  --danger-bg:  #fecaca;  --danger-fg:  #991b1b;
  --info:    #2563eb;  --info-bg:    #dbeafe;  --info-fg:    #1e40af;

  /* Categorical chart palette. Named for the spend categories they encode rather than
     by index, so a colour change stays traceable to what it represents. */
  --chart-procurement: #3b82f6;
  --chart-operational: #8b5cf6;
  --chart-labor:       #10b981;
  --chart-overhead:    #f59e0b;
  --chart-revenue:     #0f172a;
  --chart-cost:        #ef4444;

  /* Order-status series. Kept separate from the semantic --success/--warning/--danger
     tokens: those are tuned for text and badge contrast, these for adjacent fills in a
     donut, where neighbouring segments need to stay distinguishable. */
  --chart-delivered:   #10b981;
  --chart-shipped:     #3b82f6;
  --chart-processing:  #f59e0b;
  --chart-backordered: #ef4444;
  --chart-track:       #e2e8f0;

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
  --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, .04);
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, .05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, .06);

  /* Shell */
  --sidebar-w:           240px;
  --sidebar-w-collapsed: 64px;
  --content-max:         1600px;
  --header-h:            64px;

  /* Height of the mobile top bar. Zero on desktop, where no top bar exists — FilterBar
     reads this to know how far down to stick, instead of hardcoding a nav height. */
  --topbar-h: 0px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--surface-sunken);
  color: var(--text-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ---------- Shell ---------- */

.app {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-areas: "sidebar content";
  min-height: 100vh;
  /* Named areas rather than auto-placement: the sidebar renders a fixed-position
     backdrop as a second root node, and explicit areas keep it out of the tracks. */
  transition: grid-template-columns 0.18s ease;
}

.app.sidebar-collapsed {
  grid-template-columns: var(--sidebar-w-collapsed) 1fr;
}

.content-col {
  grid-area: content;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-6) var(--space-8);
}

/* ---------- Mobile top bar ---------- */

.mobile-bar {
  display: none;
  align-items: center;
  gap: var(--space-3);
  height: 56px;
  padding: 0 var(--space-4);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 95;
}

.drawer-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.drawer-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.drawer-toggle svg {
  width: 18px;
  height: 18px;
}

.mobile-brand {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.015em;
}

/* ---------- Page header ---------- */

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h2 {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--space-1);
  letter-spacing: -0.025em;
}

.page-header p {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* ---------- Cards ---------- */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}

.card,
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.card {
  margin-bottom: var(--space-5);
}

.card:hover,
.stat-card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.stat-label {
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--space-2);
}

.stat-value {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.025em;
}

.stat-card.warning .stat-value { color: var(--warning); }
.stat-card.success .stat-value { color: var(--success); }
.stat-card.danger  .stat-value { color: var(--danger); }
.stat-card.info    .stat-value { color: var(--info); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.025em;
}

/* ---------- Tables ---------- */

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--surface-sunken);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  font-weight: 600;
  color: var(--text-tertiary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

td {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

tbody tr {
  transition: background-color 0.15s ease;
}

tbody tr:hover {
  background: var(--surface-sunken);
}

/* ---------- Badges ---------- */

.badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.badge.success,
.badge.increasing {
  background: var(--success-bg);
  color: var(--success-fg);
}

.badge.warning,
.badge.medium {
  background: var(--warning-bg);
  color: var(--warning-fg);
}

.badge.danger,
.badge.decreasing,
.badge.high {
  background: var(--danger-bg);
  color: var(--danger-fg);
}

.badge.info,
.badge.low {
  background: var(--info-bg);
  color: var(--info-fg);
}

.badge.stable {
  background: #e0e7ff;
  color: #3730a3;
}

/* ---------- States ---------- */

.loading {
  text-align: center;
  padding: var(--space-12);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.error {
  background: #fef2f2;
  border: 1px solid var(--danger-bg);
  color: var(--danger-fg);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  font-size: var(--text-sm);
}

/* ---------- Responsive ---------- */

@media (max-width: 1023px) {
  :root {
    --topbar-h: 56px;
  }

  .app,
  .app.sidebar-collapsed {
    grid-template-columns: 1fr;
    grid-template-areas: "content";
  }

  .mobile-bar {
    display: flex;
  }

  .main-content {
    padding: var(--space-5) var(--space-4);
  }
}

@media (max-width: 640px) {
  .main-content {
    padding: var(--space-4) var(--space-3);
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app {
    transition: none;
  }
}
</style>
