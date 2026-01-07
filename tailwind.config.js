/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'space-bg': '#021c17',      // Deep Luxury Green (Global Background)
        'space-card': '#0a2621',    // Dark Green Card
        'space-card2': '#12302b',   // Lighter Green Card
        'space-text': '#f0fdfa',    // Pale Mint/White text
        'space-muted': '#8fa39f',   // Muted Green-Grey
        'space-border': '#1d4039',  // Green Border
        'space-primary': '#d4af37', // Gold (Primary Action)
        'space-purple': '#bfa15f',  // Secondary Gold (replacing purple usage)
        'space-pink': '#eaddcf',    // Champagne (replacing pink usage)
        'space-danger': '#ef4444',
        'space-success': '#10b981',
        'space-yellow': '#fbbf24',
        'space-luxury': '#0a1f1c', // Keeping for specific overrides if needed
        'space-gold': '#d4af37',
        'space-gold-light': '#f3e5ab'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'slide-in': 'slide-in 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.8s ease-out forwards'
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 }
        },
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        }
      }
    },
  },
  plugins: [],
};
