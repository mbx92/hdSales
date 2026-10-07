<script setup lang="ts">
import { IconDownload, IconShare, IconX } from '~/utils/tabler-icons'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'digarasi:hide-install'
const iconUrl = '/pwa-192x192.png'

const showNativePrompt = ref(false)
const showIosHint = ref(false)
let deferredPrompt: BeforeInstallPromptEvent | null = null

const visible = computed(() => showNativePrompt.value || showIosHint.value)

onMounted(() => {
  if (localStorage.getItem(DISMISS_KEY) === '1') return

  const standalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (standalone) return

  const ua = navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isIosSafari = isIos && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
  if (isIosSafari) {
    showIosHint.value = true
    return
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    showNativePrompt.value = true
  })

  window.addEventListener('appinstalled', () => {
    showNativePrompt.value = false
    deferredPrompt = null
  })
})

async function install() {
  if (!deferredPrompt) return
  await deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  showNativePrompt.value = false
  if (choice.outcome === 'dismissed') {
    localStorage.setItem(DISMISS_KEY, '1')
  }
}

function dismiss() {
  showNativePrompt.value = false
  showIosHint.value = false
  localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed bottom-4 right-4 z-20 w-[min(22rem,calc(100%-2rem))]"
    role="dialog"
    aria-labelledby="pwa-install-title"
  >
    <div class="rounded-2xl border border-base-300 bg-base-200 p-4 shadow-2xl">
      <div class="flex items-start gap-3">
        <img :src="iconUrl" alt="" class="h-12 w-12 shrink-0 rounded-xl" />
        <div class="min-w-0 flex-1">
          <p id="pwa-install-title" class="font-semibold text-base-content">Pasang DIGARASI</p>
          <p v-if="showIosHint" class="mt-1 text-sm text-base-content/70">
            Ketuk
            <IconShare class="mx-0.5 inline h-4 w-4 align-text-bottom" :stroke-width="1.5" />
            Bagikan, lalu pilih Tambahkan ke Layar Utama.
          </p>
          <p v-else class="mt-1 text-sm text-base-content/70">
            Pasang aplikasi ini di perangkat supaya lebih cepat dibuka.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Tutup" @click="dismiss">
          <IconX class="h-5 w-5" :stroke-width="1.5" />
        </button>
      </div>
      <div v-if="showNativePrompt" class="mt-3 flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" @click="dismiss">Nanti</button>
        <button type="button" class="btn btn-primary btn-sm" @click="install">
          <IconDownload class="h-4 w-4" :stroke-width="1.5" />
          Pasang
        </button>
      </div>
      <div v-else class="mt-3 flex justify-end">
        <button type="button" class="btn btn-ghost btn-sm" @click="dismiss">Mengerti</button>
      </div>
    </div>
  </div>
</template>
