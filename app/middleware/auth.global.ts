export default defineNuxtRouteMiddleware(async (to) => {
    // Skip middleware on login page
    if (to.path === '/login') {
        return
    }

    const authStore = useAuthStore()

    // Check if user is authenticated
    if (!authStore.isAuthenticated) {
        // Try to check auth from API
        try {
            const user = await $fetch('/api/auth/me')
            if (user) {
                authStore.user = user
                authStore.isAuthenticated = true
                return
            }
        } catch {
            // Not authenticated, redirect to login
        }
        return navigateTo('/login')
    }
})
