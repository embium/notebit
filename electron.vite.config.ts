import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/main.ts',
      },
      rollupOptions: {
        external: ['@xenova/transformers'],
      },
    },
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src/'),
        '@shared': resolve(__dirname, 'src/shared/'),
        '@components': resolve(__dirname, 'src/web/components/'),
        '@assets': resolve(__dirname, 'src/assets/'),
        '@pages': resolve(__dirname, 'src/web/pages'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/preload.ts',
      },
    },
  },
  renderer: {
    root: 'src/web/',
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src/'),
        '@shared': resolve(__dirname, 'src/shared/'),
        '@components': resolve(__dirname, 'src/web/components/'),
        '@assets': resolve(__dirname, 'src/assets/'),
        '@pages': resolve(__dirname, 'src/web/pages'),
        '@': resolve(__dirname, 'src/web/'),
      },
    },
    plugins: [
      react(),
      TanStackRouterVite({
        routesDirectory: './src/web/routes',
        generatedRouteTree: './src/web/routeTree.gen.ts',
      }),
    ],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: './src/web/index.html',
        external: [
          'pouchdb-node',
          'pouchdb-find',
          'relational-pouch',
          'eventsource-parser',
          '@xenova/transformers',
        ],
      },
    },
    optimizeDeps: {
      exclude: [
        'pouchdb-node',
        'pouchdb-find',
        'relational-pouch',
        '@xenova/transformers',
      ],
    },
  },
});
