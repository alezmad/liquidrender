import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Package-level has react 19.2.3, root has react-dom 19.2.3
const pkgNodeModules = path.resolve(__dirname, '../node_modules');
const rootNodeModules = path.resolve(__dirname, '../../../node_modules');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3456,
    host: '0.0.0.0',
    open: true,
    allowedHosts: 'all',
  },
  resolve: {
    alias: {
      // Use matching 19.2.3 versions
      react: path.join(pkgNodeModules, 'react'),
      'react-dom': path.join(rootNodeModules, 'react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
