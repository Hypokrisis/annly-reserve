/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // ── Refined light green palette (based on user image) ──────────────
        'space-bg':           '#f5f7f2',   // Very light warm/greenish off-white
        'space-card':         '#ffffff',   // White
        'space-card2':        '#ecf4cc',   // Lightest cream/yellow-green 
        'space-text':         '#22321c',   // Deepest green for text
        'space-muted':        '#7ba06c',   // Mid green (darkest from image)
        'space-border':       '#c6e9bc',   // Light border
        'space-primary':      '#7ba06c',   // Main brand green
        'space-primary-dark': '#5e7d50',   // Hover state for primary
        'space-primary-light':'#a5cc90',   // Lighter brand green
        'space-purple':       '#a5cc90',   // Accent
        'space-pink':         '#c6e9bc',   // Accent
        'space-danger':       '#e05252',   
        'space-success':      '#3d9970',   
        'space-yellow':       '#d4ac0d',   
        'space-luxury':       '#5e7d50',
        'space-gold':         '#7ba06c',
        'space-gold-light':   '#a5cc90',
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
