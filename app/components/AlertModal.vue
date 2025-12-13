<script setup lang="ts">
import { IconAlertCircle, IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-vue'

const props = defineProps<{
  modelValue: boolean
  title?: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}>()

const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
}

const iconClass = computed(() => {
  switch (props.type) {
    case 'success': return 'text-success'
    case 'warning': return 'text-warning'
    case 'error': return 'text-error'
    default: return 'text-info'
  }
})

const IconComponent = computed(() => {
  switch (props.type) {
    case 'success': return IconCheck
    case 'warning': return IconAlertTriangle
    case 'error': return IconX
    default: return IconAlertCircle
  }
})
</script>

<template>
  <dialog :class="['modal', modelValue && 'modal-open']">
    <div class="modal-box">
      <div class="flex items-start gap-4">
        <div :class="['p-3 rounded-full bg-base-200', iconClass]">
          <component :is="IconComponent" class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <h3 v-if="title" class="font-bold text-lg mb-2">{{ title }}</h3>
          <p class="text-base-content/80">{{ message }}</p>
        </div>
      </div>
      <div class="modal-action">
        <button class="btn btn-primary" @click="close">OK</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </dialog>
</template>
