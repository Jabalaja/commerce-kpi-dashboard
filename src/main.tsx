import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { brandCssVariables } from './theme/brand';
import './index.css';

// Apply DIGITALL brand tokens as CSS variables on :root (single source of truth).
const root = document.documentElement;
for (const [key, value] of Object.entries(brandCssVariables())) {
  root.style.setProperty(key, value);
}
root.style.setProperty('--radius-pill', '999px');
root.style.setProperty('--space-md', '16px');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
