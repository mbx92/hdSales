<script setup lang="ts">
import { IconAlertCircle } from '@tabler/icons-vue'

definePageMeta({
  layout: false
})

const authStore = useAuthStore()

const form = ref({
  email: '',
  password: '',
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  const result = await authStore.login(form.value.email, form.value.password)

  if (result.success) {
    navigateTo('/')
  } else {
    error.value = result.message || 'Login gagal'
  }

  loading.value = false
}

// Check if already logged in
onMounted(async () => {
  const isAuth = await authStore.checkAuth()
  if (isAuth) {
    navigateTo('/')
  }
})
</script>

<template>
  <div data-theme="hdsales" class="min-h-screen bg-base-100 flex items-center justify-center p-4">
    <!-- Background Pattern -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl"></div>
    </div>

    <!-- Login Card -->
    <div class="relative w-full max-w-md">
      <div class="card bg-base-200 shadow-2xl border border-base-300">
        <div class="card-body p-8">
          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl mb-4 animate-pulse-glow">
              <span class="text-3xl font-bold text-primary-content">HD</span>
            </div>
            <h1 class="text-2xl font-bold">HD Sales</h1>
            <p class="text-base-content/60 mt-1">Harley Davidson Showroom</p>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-error mb-4">
            <IconAlertCircle class="w-6 h-6 shrink-0" :stroke-width="1.5" />
            <span>{{ error }}</span>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Email</span>
              </label>
              <input
                v-model="form.email"
                type="email"
                placeholder="owner@hdsales.com"
                class="input input-bordered bg-base-300 focus:border-primary"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Password</span>
              </label>
              <input
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                class="input input-bordered bg-base-300 focus:border-primary"
                required
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn btn-primary w-full mt-6"
            >
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              <span v-else>Masuk</span>
            </button>
          </form>

          <!-- Demo Credentials -->
          <div class="divider text-xs text-base-content/40">Demo Account</div>
          <div class="text-center text-sm text-base-content/60">
            <p>Email: <code class="bg-base-300 px-2 py-0.5 rounded">owner@hdsales.com</code></p>
            <p>Password: <code class="bg-base-300 px-2 py-0.5 rounded">admin123</code></p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
