export const useConfirm = () => {
    const showConfirm = ref(false)
    const confirmResolve = ref<((value: boolean) => void) | null>(null)
    const confirmData = ref({
        title: '',
        message: '',
        confirmText: '',
        cancelText: '',
        type: 'danger' as 'danger' | 'warning' | 'info',
    })

    const confirm = (options: {
        title?: string
        message: string
        confirmText?: string
        cancelText?: string
        type?: 'danger' | 'warning' | 'info'
    }): Promise<boolean> => {
        return new Promise((resolve) => {
            confirmData.value = {
                title: options.title || 'Konfirmasi',
                message: options.message,
                confirmText: options.confirmText || 'Ya, Lanjutkan',
                cancelText: options.cancelText || 'Batal',
                type: options.type || 'danger',
            }
            confirmResolve.value = resolve
            showConfirm.value = true
        })
    }

    const handleConfirm = () => {
        showConfirm.value = false
        confirmResolve.value?.(true)
        confirmResolve.value = null
    }

    const handleCancel = () => {
        showConfirm.value = false
        confirmResolve.value?.(false)
        confirmResolve.value = null
    }

    return {
        showConfirm,
        confirmData,
        confirm,
        handleConfirm,
        handleCancel,
    }
}
