// Composable for showing alert modals
const alertState = reactive({
    show: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error'
})

export const useAlert = () => {
    const showAlert = (message: string, options?: { title?: string; type?: 'info' | 'success' | 'warning' | 'error' }) => {
        alertState.message = message
        alertState.title = options?.title || ''
        alertState.type = options?.type || 'info'
        alertState.show = true
    }

    const showError = (message: string, title?: string) => {
        showAlert(message, { title: title || 'Error', type: 'error' })
    }

    const showSuccess = (message: string, title?: string) => {
        showAlert(message, { title: title || 'Berhasil', type: 'success' })
    }

    const showWarning = (message: string, title?: string) => {
        showAlert(message, { title: title || 'Peringatan', type: 'warning' })
    }

    const closeAlert = () => {
        alertState.show = false
    }

    return {
        alertState,
        showAlert,
        showError,
        showSuccess,
        showWarning,
        closeAlert
    }
}
