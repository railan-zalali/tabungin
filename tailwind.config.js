/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './App.{js,jsx,ts,tsx}',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                primary: '#1DB954',
                'primary-dark': '#158A3E',
                secondary: '#F5A623',
                background: '#F7F9FC',
                surface: '#FFFFFF',
                danger: '#EF4444',
                success: '#10B981',
                border: '#E5E7EB',
                'text-primary': '#1A1A2E',
                'text-secondary': '#6B7280',
            },
        },
    },
    plugins: [],
};
