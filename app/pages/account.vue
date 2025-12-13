<script setup lang="ts">
import { IconLock, IconUser, IconKey, IconCheck } from '@tabler/icons-vue'

const authStore = useAuthStore()
const { showError, showSuccess } = useAlert()

const loading = ref(false)
const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
})

const changePassword = async () => {
    if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmPassword) {
        showError('Semua field harus diisi')
        return
    }

    if (passwordForm.value.newPassword.length < 6) {
        showError('Password baru minimal 6 karakter')
        return
    }

    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        showError('Konfirmasi password tidak cocok')
        return
    }

    loading.value = true

    try {
        const response = await $fetch<{ success: boolean; message: string }>('/api/auth/change-password', {
            method: 'POST',
            body: passwordForm.value,
        })

        if (response.success) {
            showSuccess(response.message || 'Password berhasil diubah')
            passwordForm.value = {
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }
        }
    } catch (error: any) {
        showError(error.data?.message || 'Gagal mengubah password')
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="max-w-2xl mx-auto space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-3xl font-bold">Pengaturan Akun</h1>
            <p class="text-base-content/60">Kelola informasi akun dan keamanan</p>
        </div>

        <!-- User Info Card -->
        <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
                <div class="flex items-center gap-4">
                    <div class="avatar placeholder">
                        <div class="bg-primary text-primary-content rounded-full w-16">
                            <span class="text-2xl">{{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
                        </div>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold">{{ authStore.user?.name || 'User' }}</h2>
                        <p class="text-base-content/60">{{ authStore.user?.email }}</p>
                        <span class="badge badge-primary badge-sm mt-1">{{ authStore.user?.role }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Change Password Card -->
        <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
                <div class="flex items-center gap-2 mb-4">
                    <IconKey class="w-5 h-5" :stroke-width="1.5" />
                    <h2 class="card-title text-lg">Ubah Password</h2>
                </div>

                <form @submit.prevent="changePassword" class="space-y-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Password Saat Ini</span>
                        </label>
                        <div class="relative">
                            <IconLock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" :stroke-width="1.5" />
                            <input
                                v-model="passwordForm.currentPassword"
                                type="password"
                                placeholder="Masukkan password saat ini"
                                class="input input-bordered w-full pl-10 bg-base-300"
                                required
                            />
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Password Baru</span>
                        </label>
                        <div class="relative">
                            <IconLock class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" :stroke-width="1.5" />
                            <input
                                v-model="passwordForm.newPassword"
                                type="password"
                                placeholder="Masukkan password baru (min. 6 karakter)"
                                class="input input-bordered w-full pl-10 bg-base-300"
                                minlength="6"
                                required
                            />
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Konfirmasi Password Baru</span>
                        </label>
                        <div class="relative">
                            <IconCheck class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" :stroke-width="1.5" />
                            <input
                                v-model="passwordForm.confirmPassword"
                                type="password"
                                placeholder="Ulangi password baru"
                                class="input input-bordered w-full pl-10 bg-base-300"
                                required
                            />
                        </div>
                        <label v-if="passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword" class="label">
                            <span class="label-text-alt text-error">Password tidak cocok</span>
                        </label>
                    </div>

                    <div class="pt-2">
                        <button type="submit" class="btn btn-primary w-full" :disabled="loading">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            {{ loading ? 'Menyimpan...' : 'Simpan Password Baru' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
