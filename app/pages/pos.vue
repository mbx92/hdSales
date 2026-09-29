<script setup lang="ts">
import {
  IconBox,
  IconLayoutDashboard,
  IconLogout,
  IconPackage,
  IconPlus,
  IconShoppingCart,
} from '~/utils/tabler-icons'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const { alertState } = useAlert()
const canManageProducts = computed(() => authStore.user?.role !== 'CASHIER')
const canOpenDashboard = computed(() => authStore.user?.role !== 'CASHIER')

const logout = async () => {
  await authStore.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh bg-base-100 p-3 md:h-dvh md:overflow-hidden">
    <div class="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1920px] flex-col gap-3 md:h-full md:min-h-0">
      <header class="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200 px-3 py-2 shadow-sm">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="DIGARASI" class="h-10 w-10 object-contain" />
          <div>
            <h1 class="flex items-center gap-2 font-bold leading-tight">
              <IconShoppingCart class="h-5 w-5 text-primary" />
              Kasir / POS
            </h1>
            <p class="text-xs text-base-content/60">{{ authStore.user?.name }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2">
          <NuxtLink to="/spareparts/create?returnTo=/pos" class="btn btn-primary btn-sm gap-1.5">
            <IconPlus class="h-4 w-4" />
            Input Service / Sparepart
          </NuxtLink>
          <NuxtLink v-if="canManageProducts" to="/products/new" class="btn btn-secondary btn-sm gap-1.5">
            <IconBox class="h-4 w-4" />
            Input Product
          </NuxtLink>
          <NuxtLink to="/spareparts" class="btn btn-ghost btn-sm gap-1.5">
            <IconPackage class="h-4 w-4" />
            Kelola Stok
          </NuxtLink>
          <NuxtLink
            v-if="canOpenDashboard"
            to="/"
            class="btn btn-ghost btn-sm btn-square"
            title="Dashboard"
            aria-label="Buka dashboard"
          >
            <IconLayoutDashboard class="h-5 w-5" />
          </NuxtLink>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square text-error"
            title="Logout"
            aria-label="Logout"
            @click="logout"
          >
            <IconLogout class="h-5 w-5" />
          </button>
        </div>
      </header>

      <main class="min-h-0 flex-1">
        <PosTerminal />
      </main>
    </div>

    <AlertModal
      v-model="alertState.show"
      :title="alertState.title"
      :message="alertState.message"
      :type="alertState.type"
    />
  </div>
</template>
