import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root:'client',
  base: process.env.GITHUB_ACTIONS ? '/syncbeats/' : '/',
  plugins:[react()],
  server:{port:5173,host:'0.0.0.0'}
});
