import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import './index.css';

// Apply theme before first render to avoid flash (dark by default for new visitors)
if (!localStorage.getItem('spacey-theme')) localStorage.setItem('spacey-theme', 'dark');
const _t = localStorage.getItem('spacey-theme') ?? 'dark';
document.documentElement.classList.toggle('dark', _t === 'dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
