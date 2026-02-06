import { defineConfig } from 'vite';

export default defineConfig({
  // Root is the project directory (index.html lives here)
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Ensure legacy scripts (app.js, ai.js, stats.js) are included
    rollupOptions: {
      input: 'index.html',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
