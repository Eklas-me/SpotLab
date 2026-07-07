import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5180,
    open: true,
  },
  build: {
    outDir: 'dist',
    minify: 'terser',
  },
});
