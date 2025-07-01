// import MillionLint from '@million/lint'
// vite.config.js in @polka/renderer package
import { defineConfig } from 'vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import { chrome } from '../../.electron-vendors.cache.json'
import tsconfigPaths from 'vite-tsconfig-paths' // Import the plugin
import tailwindcss from '@tailwindcss/vite'
import webfontDownload from 'vite-plugin-webfont-dl'

const PACKAGE_ROOT = __dirname
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  resolve: {
    preserveSymlinks: true,
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/',
      '@': join(PACKAGE_ROOT, 'src') + '/', // Added alias for '@'
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
      'next/font/local': join(PACKAGE_ROOT, 'noop.js')
      // '@polka/db': join(PROJECT_ROOT, 'packages/database/src/index.js'),
    }
  },
  optimizeDeps: {
    // exclude: ['@electric-sql/pglite']
    // include: ['@polka/db', '@polka/db/schema']
    // exclude: ['@polka/db']
  },
  base: '/',
  server: {
    fs: {
      strict: true
    }
  },
  build: {
    sourcemap: true,
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      input: join(PACKAGE_ROOT, 'index.html')
    },
    emptyOutDir: true,
    reportCompressedSize: false
  },
  test: {
    environment: 'happy-dom'
  },
  plugins: [
    // MillionLint.vite({
    //   enabled: true,
    // }),
    // TanStackRouterVite({ autoCodeSplitting: true }),
    tanstackRouter({
      routesDirectory: join(PACKAGE_ROOT, 'src/routes'),
      generatedRouteTree: join(PACKAGE_ROOT, 'src/routeTree.gen.ts'),
      target: 'react',
      autoCodeSplitting: true
    }),
    react(),
    tailwindcss(),
    webfontDownload(
      [
        'https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..800,0..1,0..1,0..1&display=swap'
      ],
      {
        cache: true
      }
    ),
    tsconfigPaths()
  ]
})
