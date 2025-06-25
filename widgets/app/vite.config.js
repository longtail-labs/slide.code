// import MillionLint from '@million/lint'
// vite.config.js in @polka/renderer package
import { defineConfig } from 'vite'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import react from '@vitejs/plugin-react'
import { join } from 'path'
import { chrome } from '../../.electron-vendors.cache.json'
import tsconfigPaths from 'vite-tsconfig-paths' // Import the plugin
import Unfonts from 'unplugin-fonts/vite'
import tailwindcss from '@tailwindcss/vite'

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
  base: './',
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
    tailwindcss(),
    // MillionLint.vite({
    //   enabled: true,
    // }),
    react(),
    Unfonts({
      custom: {
        families: [
          {
            name: 'Geist',
            src: './src/assets/fonts/geist/*.woff2'
          }
        ]
      }
    }),
    TanStackRouterVite(),
    tsconfigPaths()
  ]
})
