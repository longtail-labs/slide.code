import { build, createServer } from 'vite'
import electronPath from 'electron'
import { spawn } from 'child_process'
import path from 'path'

/**
 * Development mode flag
 */
const mode = 'development'
process.env.NODE_ENV = mode
process.env.MODE = mode

/** @type {import('vite').LogLevel} */
const logLevel = 'info'

/**
 * Setup watcher for `main` package
 * On file changed it totally re-launch electron app.
 */
function setupMainPackageWatcher() {
  /** @type {import('child_process').ChildProcess | null} */
  let electronApp = null

  return build({
    mode,
    logLevel,
    configFile: 'apps/main/vite.config.js',
    build: {
      /**
       * Set to {} to enable rollup watcher
       * @see https://vitejs.dev/config/build-options.html#build-watch
       */
      watch: {}
    },
    plugins: [
      {
        name: 'reload-app-on-main-package-change',
        writeBundle() {
          /** Kill electron if process already exist */
          if (electronApp !== null) {
            electronApp.removeListener('exit', process.exit)

            electronApp.kill('SIGINT')
            electronApp = null
          }

          // Short delay before starting new process to allow for cleanup
          setTimeout(() => {
            /** Spawn new electron process */
            electronApp = spawn(String(electronPath), ['--inspect', '.'], {
              stdio: 'inherit',
              env: process.env
            })

            /** Stops the watch script when the application has been quit */
            electronApp.addListener('exit', process.exit)
          }, 500)
        }
      }
    ]
  })
}

async function setupRendererPackageWatcher() {
  try {
    const server = await createServer({
      mode,
      logLevel,
      configFile: 'widgets/app/vite.config.js',
      root: path.resolve(process.cwd(), 'widgets/app')
    })

    await server.listen()
    const url = server.resolvedUrls.local[0]
    process.env.VITE_DEV_SERVER_URL = url
    console.log(`[watch.js] Renderer server running at ${url}`)
  } catch (error) {
    console.error(`Failed to start renderer watcher:`, error)
    process.exit(1)
  }
}

// Main execution sequence
async function main() {
  try {
    console.log('Starting development environment...')
    await setupRendererPackageWatcher()
    console.log('Starting development environment for apps/main...')
    await setupMainPackageWatcher()
    console.log('Development environment ready!')
  } catch (error) {
    console.error('Failed to start development environment:', error)
    process.exit(1)
  }
}

// Run the main function
main()
