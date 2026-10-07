<script setup lang="ts">
import { IconHome, IconMotorbike, IconCash, IconChartBar, IconLogout, IconMenu2, IconPackage, IconTruck, IconReportAnalytics, IconBox, IconWallet, IconUsers, IconShoppingCart } from '~/utils/tabler-icons'

const route = useRoute()
const authStore = useAuthStore()
const { alertState, closeAlert } = useAlert()

const baseMenuItems = [
  { path: '/', label: 'Dashboard', icon: IconHome },
  { path: '/pos', label: 'Kasir / POS', icon: IconShoppingCart },
  { path: '/motorcycles', label: 'Motor', icon: IconMotorbike },
  { path: '/products', label: 'Products', icon: IconBox },
  { path: '/spareparts', label: 'Services & Spareparts', icon: IconPackage },
  { path: '/sales', label: 'Penjualan', icon: IconCash },
  { path: '/expenses', label: 'Expenses', icon: IconWallet },
  { path: '/reports', label: 'Laporan', icon: IconReportAnalytics },
  { path: '/cashflow', label: 'Cash Flow', icon: IconChartBar },
  { path: '/settings/suppliers', label: 'Suppliers', icon: IconTruck },
]

const menuItems = computed(() => {
  if (authStore.user?.role === 'CASHIER') {
    return baseMenuItems.filter(item =>
      ['/pos', '/spareparts', '/settings/suppliers'].includes(item.path)
    )
  }

  const items = [...baseMenuItems]
  // Add Users menu only for OWNER
  if (authStore.user?.role === 'OWNER') {
    items.push({ path: '/settings/users', label: 'Kelola User', icon: IconUsers })
  }
  return items
})

const sidebarOpen = ref(true)
const isMobile = ref(false)

// Check if mobile on mount and resize
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // Close sidebar by default on mobile
  if (isMobile.value) {
    sidebarOpen.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const checkMobile = () => {
  isMobile.value = window.innerWidth < 1024 // lg breakpoint
}

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

const closeSidebar = () => {
  if (isMobile.value) {
    sidebarOpen.value = false
  }
}

const logout = async () => {
  await authStore.logout()
  navigateTo('/login')
}

const userInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'U')
</script>

<template>
  <div class="min-h-screen bg-base-100">
    <!-- Mobile Overlay -->
    <div
      v-if="isMobile && sidebarOpen"
      @click="closeSidebar"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity duration-300"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-0 left-0 z-40 h-screen transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:translate-x-0 lg:w-20'
      ]"
    >
      <div class="flex h-full flex-col bg-base-200 border-r border-base-300">
        <!-- Logo -->
        <div class="flex h-16 shrink-0 items-center justify-center border-b border-base-300">
          <div class="flex items-center gap-2">
            <img src="/logo.png" alt="DIGARASI" class="w-10 h-10 object-contain" onerror="this.style.display='none'" />
            <span v-if="sidebarOpen" class="text-xl font-bold text-base-content animate-fade-in">
              DIGARASI
            </span>
          </div>
        </div>

        <!-- Menu -->
        <nav class="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            @click="closeSidebar"
            :class="[
              'flex items-center gap-3 py-3 rounded-lg transition-all duration-200',
              sidebarOpen ? 'px-4 justify-start' : 'px-0 justify-center',
              route.path === item.path
                ? 'bg-primary text-primary-content shadow-lg'
                : 'text-base-content hover:bg-base-300'
            ]"
          >
            <component :is="item.icon" class="w-6 h-6 flex-shrink-0" :stroke-width="1.5" />
            <span v-if="sidebarOpen" class="animate-fade-in">{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <!-- User Info -->
        <div class="shrink-0 border-t border-base-300 bg-base-200 p-3">
          <div
            v-if="authStore.user"
            :class="sidebarOpen ? 'flex items-center gap-3' : 'flex flex-col items-center gap-2'"
          >
            <NuxtLink
              to="/account"
              title="Pengaturan Akun"
              class="avatar placeholder shrink-0 rounded-full transition-all hover:ring-2 hover:ring-primary"
              @click="closeSidebar"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-content">
                <span>{{ userInitial }}</span>
              </div>
            </NuxtLink>
            <NuxtLink
              v-if="sidebarOpen"
              to="/account"
              title="Pengaturan Akun"
              class="min-w-0 flex-1 hover:text-primary transition-colors"
              @click="closeSidebar"
            >
              <p class="truncate text-sm font-medium">{{ authStore.user.name }}</p>
              <p class="truncate text-xs text-base-content/60">{{ authStore.user.role }}</p>
            </NuxtLink>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square shrink-0"
              title="Logout"
              @click="logout"
            >
              <IconLogout class="h-5 w-5" :stroke-width="1.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div :class="['transition-all duration-300', sidebarOpen ? 'lg:ml-64' : 'lg:ml-20']">
      <!-- Top Bar -->
      <header class="sticky top-0 z-30 bg-base-100/80 backdrop-blur-lg border-b border-base-300">
        <div class="flex items-center justify-between h-16 px-4">
          <div class="flex items-center gap-3">
            <button @click="toggleSidebar" class="btn btn-ghost btn-square">
              <IconMenu2 class="w-6 h-6" :stroke-width="1.5" />
            </button>
            <!-- Mobile/Tablet Logo -->
            <div class="flex items-center gap-2 lg:hidden">
              <img src="/logo.png" alt="DIGARASI" class="w-8 h-8 object-contain" onerror="this.style.display='none'" />
              <span class="text-lg font-bold text-base-content">DIGARASI ID</span>
            </div>
          </div>
          
        <div class="flex items-center gap-4">
          <!-- Spacer or future elements -->
        </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
    
    <!-- Global Alert Modal -->
    <AlertModal
      v-model="alertState.show"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
    />
  </div>
</template>
