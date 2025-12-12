import { defineStore } from 'pinia'

interface User {
    id: string
    email: string
    name: string
    role: string
}

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        user: null,
        token: null,
        isAuthenticated: false,
    }),

    actions: {
        async login(email: string, password: string) {
            try {
                const response = await $fetch('/api/auth/login', {
                    method: 'POST',
                    body: { email, password },
                })

                if (response.success) {
                    this.user = response.user
                    this.token = response.token
                    this.isAuthenticated = true
                    return { success: true }
                }
                return { success: false, message: 'Login gagal' }
            } catch (error: any) {
                return { success: false, message: error.data?.message || 'Login gagal' }
            }
        },

        async logout() {
            try {
                await $fetch('/api/auth/logout', { method: 'POST' })
            } catch (e) {
                // Ignore errors
            }
            this.user = null
            this.token = null
            this.isAuthenticated = false
        },

        async checkAuth() {
            try {
                const user = await $fetch('/api/auth/me')
                this.user = user
                this.isAuthenticated = true
                return true
            } catch (e) {
                this.user = null
                this.isAuthenticated = false
                return false
            }
        },
    },

    persist: true,
})
