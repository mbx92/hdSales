<script setup lang="ts">
import { IconAlertTriangle, IconX } from '@tabler/icons-vue'

const props = defineProps<{
  show: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const typeClasses = {
  danger: 'btn-error',
  warning: 'btn-warning',
  info: 'btn-info',
}
</script>

<template>
  <Teleport to="body">
    <dialog :class="['modal', show && 'modal-open']">
      <div class="modal-box bg-base-200">
        <div class="flex items-start gap-4">
          <div v-if="type === 'danger' || type === 'warning'" 
               :class="['flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', 
                        type === 'danger' ? 'bg-error/20' : 'bg-warning/20']">
            <IconAlertTriangle 
              :class="['w-6 h-6', type === 'danger' ? 'text-error' : 'text-warning']" 
              :stroke-width="1.5" 
            />
          </div>
          <div class="flex-1">
            <h3 class="font-bold text-lg mb-2">{{ title || 'Konfirmasi' }}</h3>
            <p class="text-base-content/80">{{ message }}</p>
          </div>
        </div>
        
        <div class="modal-action">
          <button 
            type="button" 
            class="btn btn-ghost" 
            @click="emit('cancel')"
          >
            {{ cancelText || 'Batal' }}
          </button>
          <button 
            type="button" 
            :class="['btn', typeClasses[type || 'danger']]"
            @click="emit('confirm')"
          >
            {{ confirmText || 'Ya, Lanjutkan' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="emit('cancel')">close</button>
      </form>
    </dialog>
  </Teleport>
</template>
