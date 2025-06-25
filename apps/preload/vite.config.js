import { chrome } from '../../.electron-vendors.cache.json'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import { builtinModules } from 'module'
import { dependencies } from './package.json'

const PACKAGE_ROOT = __dirname
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

/**
 * @type {import('vite').UserConfig}
 * @see https://vitejs.dev/config/
 */
const config = defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  build: {
    ssr: true,
    sourcemap: 'inline',
    target: `chrome${chrome}`,
    outDir: 'dist',
    assetsDir: '.',
    minify: process.env.MODE !== 'development',
    lib: {
      entry: 'src/index.ts',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        // ESM preload scripts must have the .mjs extension
        // https://www.electronjs.org/docs/latest/tutorial/esm#esm-preload-scripts-must-have-the-mjs-extension
        entryFileNames: '[name].mjs'
      },
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        // ...Object.keys(dependencies || {}),
        'electron'
      ]
    },
    emptyOutDir: true,
    reportCompressedSize: false
  }
})

export default config
