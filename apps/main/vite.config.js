import { node } from '../../.electron-vendors.cache.json'
import { join, dirname } from 'node:path'
import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import { fileURLToPath } from 'node:url'

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PACKAGE_ROOT = __dirname
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
export default defineConfig({
  mode: process.env.MODE || 'production',
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  resolve: {
    alias: {
      '/@/': join(PACKAGE_ROOT, 'src') + '/'
    }
  },
  define: {
    __dirname: JSON.stringify(PACKAGE_ROOT)
  },
  build: {
    ssr: true,
    target: `node${node}`,
    sourcemap: false,
    minify: process.env.NODE_ENV === 'production',
    outDir: 'dist',
    emptyOutDir: true,
    reportCompressedSize: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        format: 'es'
      },
      external: [
        'electron',
        ...builtinModules.map((m) => `node:${m}`),
        ...builtinModules,
        // External packages that cause build issues
        'conf',
        'ajv-formats',
        'electron-log',
        '@opentelemetry/instrumentation',
        '@opentelemetry/api',
        'shimmer',
        'require-in-the-middle'
      ]
    }
  }
})
