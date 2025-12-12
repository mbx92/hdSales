export default defineEventHandler(async (event) => {
    // Clear auth cookie
    deleteCookie(event, 'auth_token', {
        path: '/',
    })

    return {
        success: true,
        message: 'Logout berhasil',
    }
})
