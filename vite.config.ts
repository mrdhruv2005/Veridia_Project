import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || './',
  resolve: { preserveSymlinks: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', pool: 'threads' },
  build: { outDir: 'dist' },
});
