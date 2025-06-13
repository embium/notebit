import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/main/index.ts',
      },
      rollupOptions: {
        external: ['@xenova/transformers'],
      },
    },
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src/'),
        '@main': resolve(__dirname, 'src/main/'),
        '@preload': resolve(__dirname, 'src/preload/'),
        '@shared': resolve(__dirname, 'src/shared/'),
        '@types': resolve(__dirname, 'src/types/'),
        '@assets': resolve(__dirname, 'src/assets/'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: 'src/preload/index.ts',
      },
    },
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src/'),
        '@main': resolve(__dirname, 'src/main/'),
        '@shared': resolve(__dirname, 'src/shared/'),
        '@types': resolve(__dirname, 'src/types/'),
      },
    },
  },
  renderer: {
    root: 'src/renderer/',
    resolve: {
      alias: {
        '@src': resolve(__dirname, 'src/'),
        '@main': resolve(__dirname, 'src/main/'),
        '@renderer': resolve(__dirname, 'src/renderer/'),
        '@shared': resolve(__dirname, 'src/shared/'),
        '@types': resolve(__dirname, 'src/types/'),
        '@components': resolve(__dirname, 'src/renderer/components/'),
        '@assets': resolve(__dirname, 'src/assets/'),
        '@pages': resolve(__dirname, 'src/renderer/pages'),
        '@': resolve(__dirname, 'src/renderer/'),
      },
    },
    plugins: [
      react(),
      TanStackRouterVite({
        routesDirectory: './src/renderer/routes',
        generatedRouteTree: './src/renderer/routeTree.gen.ts',
      }),
    ],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          splash: resolve(__dirname, 'src/renderer/splash.html'),
        },
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
