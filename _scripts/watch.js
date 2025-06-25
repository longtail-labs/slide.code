import { build } from 'vite'
import electronPath from 'electron'
import { spawn } from 'child_process'

/**
 * Development mode flag
 */
const mode = 'development'
process.env.NODE_ENV = mode
process.env.MODE = mode

/** @type {import('vite').LogLevel} */
const logLevel = 'debug'

/**
 * Setup watcher for `main` package
 * On file changed it totally re-launch electron app.
 */
function setupMainPackageWatcher() {
  /** @type {ChildProcess | null} */
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

            // Force kill after timeout if graceful shutdown doesn't work
            const killTimeout = setTimeout(() => {
              console.log('Forcing electron app termination')
              try {
                electronApp.kill('SIGKILL')
              } catch (e) {
                console.log('Error killing electron process:', e)
              }
            }, 1000)

            // Try graceful shutdown first
            electronApp.on('exit', () => {
              clearTimeout(killTimeout)
              electronApp = null
            })

            electronApp.kill('SIGINT')
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

// Main execution sequence
async function main() {
  try {
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
