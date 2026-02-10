/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0a0a0a',
                    800: '#171717',
                    700: '#262626',
                },
                brand: {
                    500: '#3b82f6', // bright blue
                    600: '#2563eb',
                }
            }
        },
    },
    plugins: [],
}
