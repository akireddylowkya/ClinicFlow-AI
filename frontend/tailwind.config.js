/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
        },
        teal: {
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
        },
        clinic: {
          primary: '#0369a1',    // Professional deep sky blue
          secondary: '#0f766e',  // Medical teal
          accent: '#0284c7',
          surface: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
