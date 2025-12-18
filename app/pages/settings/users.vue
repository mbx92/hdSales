<script setup lang="ts">
import { IconUserPlus, IconUser, IconAlertCircle, IconCircleCheck } from '@tabler/icons-vue'

const authStore = useAuthStore()

// Check if current user is OWNER
const isOwner = computed(() => authStore.user?.role === 'OWNER')

// Redirect if not OWNER
onMounted(() => {
    if (!isOwner.value) {
        navigateTo('/')
    }
})

const { data: usersData, refresh } = await useFetch('/api/users')

const showAddModal = ref(false)
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
})

const resetForm = () => {
    form.value = {
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    }
    error.value = ''
    success.value = ''
}

const openAddModal = () => {
    resetForm()
    showAddModal.value = true
}

const handleAddUser = async () => {
    error.value = ''
    success.value = ''

    if (form.value.password !== form.value.confirmPassword) {
        error.value = 'Password tidak sama'
        return
    }

    loading.value = true

    try {
        await $fetch('/api/users/create', {
            method: 'POST',
            body: {
                name: form.value.name,
                email: form.value.email,
                password: form.value.password
            }
        })

        success.value = 'User berhasil ditambahkan'
        await refresh()
        
        setTimeout(() => {
            showAddModal.value = false
            resetForm()
        }, 1500)
    } catch (err: any) {
        error.value = err.data?.message || 'Gagal menambah user'
    }

    loading.value = false
}
</script>

<template>
    <div v-if="isOwner" class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold">Kelola User</h1>
            </div>
            <button
                v-if="usersData?.canAddUser"
                @click="openAddModal"
                class="btn btn-primary"
            >
                <IconUserPlus class="w-5 h-5" />
                Tambah User
            </button>
        </div>

        <!-- Users List -->
        <div class="card bg-base-200">
            <div class="card-body">
                <div class="overflow-x-auto">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nama</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Dibuat</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="user in usersData?.users" :key="user.id">
                                <td class="flex items-center gap-3">
                                    <div class="avatar placeholder">
                                        <div class="bg-primary text-primary-content rounded-full w-10">
                                            <span>{{ user.name?.charAt(0) || 'U' }}</span>
                                        </div>
                                    </div>
                                    <span class="font-medium">{{ user.name }}</span>
                                </td>
                                <td>{{ user.email }}</td>
                                <td>
                                    <span :class="[
                                        'badge',
                                        user.role === 'OWNER' ? 'badge-primary' : 'badge-secondary'
                                    ]">
                                        {{ user.role }}
                                    </span>
                                </td>
                                <td>{{ new Date(user.createdAt).toLocaleDateString('id-ID') }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Info -->
                <div class="mt-4 text-sm text-base-content/60">
                    Total: {{ usersData?.totalUsers }}/{{ usersData?.maxUsers }} user
                </div>
            </div>
        </div>

        <!-- Add User Modal -->
        <dialog :class="['modal', showAddModal ? 'modal-open' : '']">
            <div class="modal-box">
                <h3 class="font-bold text-lg mb-4">Tambah User Baru</h3>
                
                <!-- Error Alert -->
                <div v-if="error" class="alert alert-error mb-4">
                    <IconAlertCircle class="w-5 h-5" />
                    <span>{{ error }}</span>
                </div>

                <!-- Success Alert -->
                <div v-if="success" class="alert alert-success mb-4">
                    <IconCircleCheck class="w-5 h-5" />
                    <span>{{ success }}</span>
                </div>

                <form @submit.prevent="handleAddUser" class="space-y-4">
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Nama</span>
                        </label>
                        <input
                            v-model="form.name"
                            type="text"
                            placeholder="Nama lengkap"
                            class="input input-bordered"
                            required
                        />
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Email</span>
                        </label>
                        <input
                            v-model="form.email"
                            type="email"
                            placeholder="email@example.com"
                            class="input input-bordered"
                            required
                        />
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Password</span>
                        </label>
                        <input
                            v-model="form.password"
                            type="password"
                            placeholder="Minimal 6 karakter"
                            class="input input-bordered"
                            minlength="6"
                            required
                        />
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Konfirmasi Password</span>
                        </label>
                        <input
                            v-model="form.confirmPassword"
                            type="password"
                            placeholder="Ulangi password"
                            class="input input-bordered"
                            minlength="6"
                            required
                        />
                    </div>

                    <div class="alert alert-info">
                        <IconUser class="w-5 h-5" />
                        <span>User baru akan mendapat role <strong>ADMIN</strong> dengan akses penuh ke data mereka sendiri.</span>
                    </div>

                    <div class="modal-action">
                        <button type="button" @click="showAddModal = false" class="btn">Batal</button>
                        <button type="submit" :disabled="loading" class="btn btn-primary">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            <span v-else>Tambah User</span>
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button @click="showAddModal = false">close</button>
            </form>
        </dialog>
    </div>

    <!-- Not Authorized -->
    <div v-else class="flex items-center justify-center min-h-[50vh]">
        <div class="text-center">
            <IconAlertCircle class="w-16 h-16 mx-auto text-warning mb-4" />
            <h2 class="text-xl font-bold">Akses Ditolak</h2>
            <p class="text-base-content/60">Hanya OWNER yang dapat mengelola user</p>
        </div>
    </div>
</template>
