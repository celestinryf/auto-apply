import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import webExtension from 'vite-plugin-web-extension';
import path from 'path';

const browser = process.env.BROWSER ?? 'chrome';

export default defineConfig({
  plugins: [
    preact(),
    webExtension({
      manifest: `manifests/${browser}.json`,
      additionalInputs: ['src/popup/index.html'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: `dist/${browser}`,
    emptyOutDir: true,
  },
});
