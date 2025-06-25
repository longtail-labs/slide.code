import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path, { join } from 'path'
import { builtinModules } from 'module'
import { dependencies } from './package.json'
import { node } from '../../.electron-vendors.cache.json'
import { fileURLToPath } from 'url'

const PACKAGE_ROOT = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..')

export default defineConfig({
  mode: process.env.MODE,
  root: PACKAGE_ROOT,
  envDir: PROJECT_ROOT,
  base: './',
  build: {
    ssr: true,
    target: `node${node}`,
    sourcemap: 'inline',
    minify: true,
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        'trpc/index': path.resolve(__dirname, 'src/trpc/index.ts'),
        'drizzle/index': path.resolve(__dirname, 'src/drizzle/index.ts'),
        'drizzle/operations': path.resolve(__dirname, 'src/drizzle/operations.ts'),
        'store/index': path.resolve(__dirname, 'src/store/index.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const extension = format === 'es' ? 'mjs' : 'cjs'
        return `${entryName}.${extension}`
      }
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
        ...Object.keys(dependencies).map((name) => new RegExp(`^${name}(\\/.*)?`)),
        // '@polka/trpc-electron/*',
        /^@polka\/.+/
        // /^convex\/.+/,
        // /^drizzle-orm(\/.*)?/,
        // /^@tanstack\/.+/,
        // /^lz-string(\/.*)?/,
        // /^react(\/.*)?/,
        // /^@trpc\/.+/
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        exports: 'named'
      }
    }
  },
  ssr: {
    noExternal: [] // Bundle 'convex' and its dependencies
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      include: ['src/**/*.ts'],
      outDir: 'dist'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
