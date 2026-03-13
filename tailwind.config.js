/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ── New light green palette (inspired by user's swatch) ──────────────
        'space-bg':           '#f4f9f6',   // Light mint background
        'space-card':         '#ffffff',   // White cards
        'space-card2':        '#eaf4ef',   // Subtle tinted card
        'space-text':         '#1a2e28',   // Dark forest text
        'space-muted':        '#6b8f80',   // Muted teal-grey
        'space-border':       '#cce3d8',   // Soft green border
        'space-primary':      '#4a8463',   // Medium forest green (CTA, active)
        'space-primary-dark': '#2d6349',   // Darker hover green
        'space-primary-light':'#b3d9c5',   // Light green (badge bg, icon bg)
        'space-purple':       '#6aac8a',   // Secondary green accent
        'space-pink':         '#9dc48b',   // Soft lime accent
        'space-danger':       '#e05252',   // Red danger
        'space-success':      '#3d9970',   // Green success
        'space-yellow':       '#d4ac0d',   // Amber/yellow
        'space-luxury':       '#2d6349',
        'space-gold':         '#4a8463',
        'space-gold-light':   '#b3d9c5',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgba(74,132,99,0.07), 0 4px 16px -4px rgba(74,132,99,0.10)',
        'card-lg': '0 4px 24px -4px rgba(74,132,99,0.15)',
        'btn':     '0 2px 8px 0 rgba(74,132,99,0.25)',
      },
      animation: {
        'float':         'float 6s ease-in-out infinite',
        'float-slow':    'float 8s ease-in-out infinite',
        'pulse-subtle':  'pulse-subtle 3s ease-in-out infinite',
        'slide-in':      'slide-in 0.3s ease-out forwards',
        'fade-in':       'fade-in 0.4s ease-out forwards',
        'fade-up':       'fade-up 0.4s ease-out forwards',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.8' }
        },
        'slide-in': {
          '0%':   { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' }
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-up': {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' }
        },
      }
    },
  },
  plugins: [],
};
