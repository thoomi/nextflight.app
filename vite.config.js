import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const root = resolve(projectRoot, 'frontend');

export default defineConfig(({ mode }) => {
  // Load non-prefixed env vars (e.g. SUPABASE_URL) from the project root.
  // We deliberately inline ONLY the two public Supabase keys via `define`
  // instead of using a broad `SUPABASE_` envPrefix, so a future
  // SUPABASE_SERVICE_ROLE_KEY can never be auto-injected into the client bundle.
  const env = loadEnv(mode, projectRoot, '');

  return {
    root,
    publicDir: false,
    define: {
      'import.meta.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL ?? ''),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY ?? ''),
    },
    build: {
      outDir: resolve(projectRoot, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          app: resolve(root, 'app.html'),
          art: resolve(root, 'art.html'),
          concept: resolve(root, 'concept.html'),
          index: resolve(root, 'index.html'),
        },
        external: ['three'],
      },
    },
    optimizeDeps: {
      exclude: ['three'],
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
