import { defineConfig } from 'vite';

export default defineConfig({
  base: '/', // Netlify serves from root
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
