import { defineConfig } from 'vite';

export default defineConfig({
  base: '/WombatQuest/', // GitHub Pages subdirectory
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
