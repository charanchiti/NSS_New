/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#f59e0b',
        green: '#22c55e',
        blue: '#3b82f6',
        purple: '#8b5cf6',
        orange: '#f97316',
        pink: '#ec4899',
        red: '#ef4444',
        card: '#1e293b',
        border: '#334155',
        muted: '#64748b',
        sub: '#94a3b8',
        bg: '#0f172a',
      }
    },
  },
  plugins: [],
}
