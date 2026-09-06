/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060608',
          900: '#0c0c10',
          850: '#121217',
          800: '#18181f',
          700: '#22222b',
          600: '#2e2e3a',
          500: '#424252',
        },
        electric: {
          blue: '#00d2ff',
          cyan: '#00f0ff',
          purple: '#9d4edd',
          pink: '#ff007f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-up': 'floatUp 2.8s ease-out forwards',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(0) scale(0.65)', opacity: '1' },
          '20%': { transform: 'translateY(-12vh) scale(1.1)', opacity: '1' },
          '65%': { transform: 'translateY(-45vh) scale(1.25)', opacity: '0.9' },
          '100%': { transform: 'translateY(-75vh) scale(1.4)', opacity: '0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(157, 78, 221, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
