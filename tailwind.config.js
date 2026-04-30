/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        'space-bg':           'rgb(var(--space-bg) / <alpha-value>)',
        'space-card':         'rgb(var(--space-card) / <alpha-value>)',
        'space-card2':        'rgb(var(--space-card2) / <alpha-value>)',
        'space-text':         'rgb(var(--space-text) / <alpha-value>)',
        'space-muted':        'rgb(var(--space-muted) / <alpha-value>)',
        'space-border':       'rgb(var(--space-border) / <alpha-value>)',
        'space-primary':      'rgb(var(--space-primary) / <alpha-value>)',
        'space-primary-dark': 'rgb(var(--space-primary-dark) / <alpha-value>)',
        'space-primary-light':'rgb(var(--space-primary-light) / <alpha-value>)',
        'space-danger':       'rgb(var(--space-danger) / <alpha-value>)',
        'space-success':      'rgb(var(--space-success) / <alpha-value>)',
        'space-yellow':       'rgb(var(--space-yellow) / <alpha-value>)',
        
        // These can still use the primary variables for fallback
        'space-purple':       'rgb(var(--space-primary-light) / <alpha-value>)',
        'space-pink':         'rgb(var(--space-border) / <alpha-value>)',
        'space-luxury':       'rgb(var(--space-primary-dark) / <alpha-value>)',
        'space-gold':         'rgb(var(--space-primary) / <alpha-value>)',
        'space-gold-light':   'rgb(var(--space-primary-light) / <alpha-value>)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(74,132,99,0.07), 0 4px 16px -4px rgba(74,132,99,0.10)',
        'card-lg': '0 4px 24px -4px rgba(74,132,99,0.15)',
        'btn': '0 2px 8px 0 rgba(74,132,99,0.25)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-up': 'fade-up 0.4s ease-out forwards',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        'slide-in': {
          '0%': { transform: 'translateX(-16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
      }
    },
  },
  plugins: [],
};
