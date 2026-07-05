import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local `npm run dev`, proxy API calls to the backend so the dev server
// behaves like the nginx production setup. In Docker the built static files are
// served by nginx, which does the proxying instead.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
    },
  },
});
