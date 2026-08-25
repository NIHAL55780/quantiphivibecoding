import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Requests to /api are proxied to the Express server, so the browser only ever
// talks to one origin during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
