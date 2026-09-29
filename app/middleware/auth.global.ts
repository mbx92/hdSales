export default defineNuxtRouteMiddleware(async (to) => {
    // Skip middleware on login page
    if (to.path === '/login') {
        return
    }

    const authStore = useAuthStore()

    const enforceCashierRoute = () => {
        if (authStore.user?.role !== 'CASHIER') return

        const allowed = [
            '/pos',
            '/spareparts',
            '/settings/suppliers',
            '/sales/sparepart-receipt',
            '/sales/sparepart-invoice',
            '/account',
        ]

        if (!allowed.some(path => to.path === path || to.path.startsWith(`${path}/`))) {
            return navigateTo('/pos')
        }
    }

    // Check if user is authenticated
    if (!authStore.isAuthenticated) {
        // Try to check auth from API
        try {
            // Forward the incoming cookie during SSR so a direct page load or
            // refresh does not send an authenticated user back to /login.
            const requestFetch = useRequestFetch()
            const user = await requestFetch('/api/auth/me')
            if (user) {
                authStore.user = user
                authStore.isAuthenticated = true
                return enforceCashierRoute()
            }
        } catch {
            // Not authenticated, redirect to login
        }
        return navigateTo('/login')
    }

    return enforceCashierRoute()
})
