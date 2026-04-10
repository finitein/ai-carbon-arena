import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3055,
    proxy: {
      '/api': {
        target: 'http://localhost:8055',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8055',
        ws: true,
      },
    },
  },
});
