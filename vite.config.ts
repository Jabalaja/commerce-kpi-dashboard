import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves project sites from /<repo>/. Setting base to the repo name
// is the single most common Pages deployment mistake; get it right here.
export default defineConfig({
  base: '/commerce-kpi-dashboard/',
  plugins: [react()],
});
