import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Split large, rarely-changing vendor libs into their own long-cacheable
    // chunks. Route-level code-splitting (React.lazy in App.tsx) already isolates
    // page-only deps like leaflet and react-easy-crop into their route chunks.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('@remix-run')) return 'router';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('date-fns')) return 'date-fns';
          }
        },
      },
    },
  },
});
