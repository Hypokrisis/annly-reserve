/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        'space-bg': 'rgb(var(--space-bg) / <alpha-value>)',
        'space-card': 'rgb(var(--space-card) / <alpha-value>)',
        'space-card2': 'rgb(var(--space-card2) / <alpha-value>)',
        'space-text': 'rgb(var(--space-text) / <alpha-value>)',
        'space-muted': 'rgb(var(--space-muted) / <alpha-value>)',
        'space-border': 'rgb(var(--space-border) / <alpha-value>)',
        'space-primary': 'rgb(var(--space-primary) / <alpha-value>)',
        'space-primary-dark': 'rgb(var(--space-primary-dark) / <alpha-value>)',
        'space-primary-light': 'rgb(var(--space-primary-light) / <alpha-value>)',
        'space-danger': 'rgb(var(--space-danger) / <alpha-value>)',
        'space-success': 'rgb(var(--space-success) / <alpha-value>)',
        'space-yellow': 'rgb(var(--space-yellow) / <alpha-value>)',
        // Colores adicionales que usan la paleta principal
        'space-purple': 'rgb(var(--space-primary-light) / <alpha-value>)',
        'space-pink': 'rgb(var(--space-border) / <alpha-value>)',
        'space-luxury': 'rgb(var(--space-primary-dark) / <alpha-value>)',
        'space-gold': 'rgb(var(--space-primary) / <alpha-value>)',
        'space-gold-light': 'rgb(var(--space-primary-light) / <alpha-value>)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // Sombras suaves que usan la variable del color primario
        'card': '0 1px 3px 0 rgb(var(--space-primary) / 0.07), 0 4px 16px -4px rgb(var(--space-primary) / 0.1)',
        'card-lg': '0 4px 24px -4px rgb(var(--space-primary) / 0.15)',
        'btn': '0 2px 8px 0 rgb(var(--space-primary) / 0.25)',
        // Sombra sutil para inputs y elementos en foco
        'input-focus': '0 0 0 3px rgb(var(--space-primary) / 0.15), 0 1px 2px 0 rgb(0 0 0 / 0.02)',
        // Efecto de elevación con glow verde
        'card-hover': '0 8px 16px -4px rgb(34 50 28 / 0.08), 0 20px 25px -5px rgb(34 50 28 / 0.06), 0 0 0 1px rgb(var(--space-primary) / 0.1), 0 0 20px -5px rgb(var(--space-primary-light) / 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-up': 'fade-up 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
      }
    },
  },
  plugins: [],
};