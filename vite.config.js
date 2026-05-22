import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/photos': 'http://localhost:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
