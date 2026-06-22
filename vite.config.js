import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const root = resolve(projectRoot, 'frontend');

export default defineConfig(() => {
  return {
    root,
    publicDir: false,
    build: {
      outDir: resolve(projectRoot, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          app: resolve(root, 'app.html'),
          concept: resolve(root, 'concept.html'),
          index: resolve(root, 'index.html'),
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 8765,
    },
    preview: {
      host: '127.0.0.1',
      port: 8765,
    },
  };
});
