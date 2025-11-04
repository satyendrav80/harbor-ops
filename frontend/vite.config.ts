import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'APP_'],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.APP_PORT || 3045),
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.APP_PORT || 3045),
  },
  resolve: {
    alias: {},
  },
  optimizeDeps: {
    include: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@tiptap/extension-link',
      '@tiptap/extension-text-style',
      '@tiptap/extension-color',
      '@tiptap/extension-highlight',
    ],
  },
});
