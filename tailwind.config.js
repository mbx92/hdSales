/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './app/components/**/*.{js,vue,ts}',
        './app/layouts/**/*.vue',
        './app/pages/**/*.vue',
        './app/plugins/**/*.{js,ts}',
        './app/app.vue',
        './app/error.vue',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                'hd-orange': {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                },
                'hd-gold': {
                    50: '#fefce8',
                    100: '#fef9c3',
                    200: '#fef08a',
                    300: '#fde047',
                    400: '#facc15',
                    500: '#eab308',
                    600: '#ca8a04',
                    700: '#a16207',
                    800: '#854d0e',
                    900: '#713f12',
                },
            },
        },
    },
    plugins: [require('daisyui')],
    daisyui: {
        themes: [
            {
                hdsales: {
                    'primary': '#3b82f6',        // Blue
                    'primary-content': '#ffffff',
                    'secondary': '#f97316',      // Orange
                    'secondary-content': '#ffffff',
                    'accent': '#eab308',         // Gold
                    'accent-content': '#000000',
                    'neutral': '#374151',        // Gray
                    'neutral-content': '#ffffff',
                    'base-100': '#ffffff',       // White background
                    'base-200': '#f3f4f6',       // Light gray
                    'base-300': '#e5e7eb',       // Medium gray
                    'base-content': '#111827',   // Dark text
                    'info': '#0ea5e9',
                    'info-content': '#ffffff',
                    'success': '#22c55e',
                    'success-content': '#ffffff',
                    'warning': '#f59e0b',
                    'warning-content': '#000000',
                    'error': '#ef4444',
                    'error-content': '#ffffff',
                },
            },
            'light',
            'cupcake',
        ],
        darkTheme: false,
    },
}
