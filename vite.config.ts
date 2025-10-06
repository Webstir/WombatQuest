import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wq2/', // GitHub Pages subdirectory
  resolve: {
    alias: {
      '@': './',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
