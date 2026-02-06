import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

// Custom plugin to copy legacy non-module scripts to dist
function copyLegacyFiles() {
  const files = ['app.js', 'ai.js', 'stats.js', 'sw.js', 'manifest.json', 'icon.svg'];
  return {
    name: 'copy-legacy-files',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      for (const file of files) {
        const src = resolve(__dirname, file);
        if (existsSync(src)) {
          copyFileSync(src, resolve(outDir, file));
        }
      }
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
  plugins: [copyLegacyFiles()],
  server: {
    port: 3000,
    open: true,
  },
});
