import { defineStore } from 'pinia'

interface User {
    id: string
    email: string
    name: string
    role: string
}

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const token = ref<string | null>(null)
    const isAuthenticated = ref(false)

    async function login(email: string, password: string) {
        try {
            const response = await $fetch<{ success: boolean; user: User; token: string; message?: string }>('/api/auth/login', {
                method: 'POST',
                body: { email, password },
            })

            if (response.success) {
                user.value = response.user
                token.value = response.token
                isAuthenticated.value = true
                return { success: true }
            }
            return { success: false, message: 'Login gagal' }
        } catch (error: any) {
            return { success: false, message: error.data?.message || 'Login gagal' }
        }
    }

    async function logout() {
        try {
            await $fetch('/api/auth/logout', { method: 'POST' })
        } catch (e) {
            // Ignore errors
        }
        user.value = null
        token.value = null
        isAuthenticated.value = false
    }

    async function checkAuth(): Promise<boolean> {
        try {
            const userData = await $fetch<User>('/api/auth/me')
            user.value = userData
            isAuthenticated.value = true
            return true
        } catch (e) {
            user.value = null
            isAuthenticated.value = false
            return false
        }
    }

    return {
        user,
        token,
        isAuthenticated,
        login,
        logout,
        checkAuth,
    }
}, {
    persist: true,
})
