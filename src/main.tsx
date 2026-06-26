import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply saved theme immediately to prevent flash
try {
  const saved = localStorage.getItem('apex_gantt_state_v1');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } else {
    // Default to dark
    document.documentElement.classList.add('dark');
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
