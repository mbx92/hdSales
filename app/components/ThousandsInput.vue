<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  modelValue?: string | number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const formattedValue = computed(() => {
  const digits = String(props.modelValue ?? '').replace(/\D/g, '')

  if (!digits) return ''

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
})

const handleInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')

  emit('update:modelValue', digits)
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="formattedValue"
    type="text"
    inputmode="numeric"
    autocomplete="off"
    @input="handleInput"
  />
</template>
