/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Mana & Meeples Brand Colors
        mm: {
          cream: '#f4f1e8',        // Body background
          warmAccent: '#e4dcd2',   // Card borders, alternate backgrounds
          darkForest: '#1f2f2d',   // Primary text
          forest: '#2d4a47',       // Headers, dark borders
          teal: '#4a6b67',         // Secondary text
          tealLight: '#e8f4f1',    // Section backgrounds, hover states
          tealBright: '#4a9b8e',   // Primary actions, accents
          gold: '#8b6914',         // CTAs, special highlights
          goldDark: '#6b5010',     // Hover states for gold
        },
        // Keep some utility colors
        white: '#ffffff',
        black: '#000000',
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        'mm-card': '0 2px 4px rgba(0,0,0,0.05)',
        'mm-card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        'mm-section': '0 4px 12px rgba(0,0,0,0.1)',
        'mm-strong': '0 6px 20px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        'mm-sm': '5px',
        'mm-md': '8px',
        'mm-lg': '10px',
        'mm-xl': '12px',
        'mm-2xl': '15px',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      }
    },
  },
  plugins: [],
}