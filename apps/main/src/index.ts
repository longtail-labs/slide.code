import fixPath from 'fix-path'

// Fix the PATH environment variable for macOS packaged apps
// This must be the first thing to run
fixPath()

import { app } from 'electron'
import {
  configurePerformanceOptimizations,
  ensureSingleInstance,
  SlideRuntime,
  config,
  MenuService,
  PubSubClient,
  ElectronEventService,
  registerDeepLinkingProtocol,
  createVibeDir,
  UserRef,
  DatabaseService,
  initializeCcusageSync,
  initializeClaudeCodeAuth,
  initializeAptabaseEffect
} from '@slide.code/core'
import { Effect, Fiber, Match, Stream } from 'effect'
import log from 'electron-log'

import { createAppReady } from '@slide.code/schema/messages'

log.info('[MAIN] 🚀 Starting SlideCode main process')
log.info('[MAIN] 📍 Current working directory:', process.cwd())
log.info('[MAIN] 📍 __dirname:', __dirname)
log.info('[MAIN] 📍 App path:', app.getAppPath())
log.info('[MAIN] 📍 Exe path:', app.getPath('exe'))
log.info('[MAIN] 🔧 Node version:', process.version)
log.info('[MAIN] 🔧 Electron version:', process.versions.electron)
log.info('[MAIN] 📦 App version:', app.getVersion())

// Check if running from system32 on Windows
if (process.platform === 'win32' && process.cwd().toLowerCase().includes('system32')) {
  log.warn('[MAIN] ⚠️ Running from system32, this may cause issues!')
}

// Global references to prevent garbage collection
let eventHandlerFiber: Fiber.RuntimeFiber<any, any> | null = null

// Using the generator approach with Effect.gen
const program = Effect.gen(function* () {
  try {
    log.info('[MAIN] 🔄 Starting main program execution')

    log.info('[MAIN] 🔄 Registering deep linking protocol...')
    yield* registerDeepLinkingProtocol
    log.info('[MAIN] ✅ Deep linking protocol registered')

    log.info('[MAIN] 🔄 Getting services...')
    const menuService = yield* MenuService
    log.info('[MAIN] ✅ MenuService obtained')
    const pubsub = yield* PubSubClient
    log.info('[MAIN] ✅ PubSubClient obtained')
    const electronEventService = yield* ElectronEventService // Get the electron event service
    log.info('[MAIN] ✅ ElectronEventService obtained')
    const userRef = yield* UserRef
    log.info('[MAIN] ✅ UserRef obtained')
    const dbService = yield* DatabaseService
    log.info('[MAIN] ✅ DatabaseService obtained')

    log.info('[MAIN] 🔄 Initializing electron event service...')
    yield* electronEventService.initialize
    log.info('[MAIN] ✅ Electron event service initialized')

    log.info('[MAIN] 🔄 Configuring performance optimizations and ensuring single instance...')
    yield* Effect.all([configurePerformanceOptimizations, ensureSingleInstance])
    log.info('[MAIN] ✅ Performance optimizations configured and single instance ensured')

    const vibeDir = yield* createVibeDir
    yield* userRef.updateVibeDirectory(vibeDir)
    log.info('[MAIN] ✅ Vibe directory created:', vibeDir)

    const dbConfig = yield* config.databaseConfig
    const aptabaseConfig = yield* config.aptabaseConfig

    // Wait for app to be ready before proceeding
    yield* Effect.promise(() => app.whenReady())
    log.info('[MAIN] ✅ Electron app is ready, continuing startup')

    try {
      // Initialize and run migrations in one step
      log.info('[MAIN] 🗄️ Initializing database and running migrations', dbConfig)
      yield* dbService.initAndMigrate(dbConfig)
      log.info('[MAIN] ✅ Database initialized and migrated successfully')
    } catch (error) {
      log.error('[MAIN] ❌ Database initialization failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      yield* pubsub.publish(createAppReady(true, `Database initialization failed: ${errorMessage}`))
      return yield* Effect.fail(error)
    }

    // Initialize Aptabase analytics
    log.info('[MAIN] 📊 Initializing Aptabase analytics')
    yield* Effect.fork(initializeAptabaseEffect(aptabaseConfig))
    log.info('[MAIN] ✅ Aptabase analytics initialized')

    // Handle app events using the ElectronEventService
    log.info('[MAIN] 🔄 Setting up event handler stream')
    const eventHandler = electronEventService.stream.pipe(
      Stream.tap((event) => Effect.sync(() => log.info('[MAIN] 🔄 Processing event:', event._tag))),
      Stream.runForEach((event) => {
        return Effect.gen(function* () {
          log.info('[MAIN] 🔄 Handling electron event:', event._tag)

          return yield* Match.value(event._tag).pipe(
            Match.when('window-all-closed', () =>
              Effect.gen(function* () {
                app.quit()
                app.exit(0)
              })
            ),
            Match.when('activate', () =>
              Effect.sync(() => {
                // if (BrowserWindow.getAllWindows().length === 0 || !viewManager.hasWindow()) {
                //   logger.info('Creating new window on activate')
                //   viewManager.createPlanningWindow()
                // }
              })
            ),
            Match.when('before-quit', () =>
              Effect.gen(function* () {
                yield* Effect.logInfo('Handling before-quit event')
                // No need to do anything special here now
              })
            ),
            Match.when('quit', () =>
              Effect.gen(function* () {
                const exitCode = (event as any).exitCode ?? 0
                yield* Effect.logInfo(`Handling quit event with exit code: ${exitCode}`)
                // Runtime disposal is handled synchronously in will-quit
              })
            ),
            // Authentication events
            Match.orElse(() => Effect.succeed(undefined))
          )
        })
      })
    )

    // Fork event handler to run in background and save the fiber
    eventHandlerFiber = yield* Effect.fork(eventHandler)
    log.info('[MAIN] ✅ Event handler started and forked')

    // Initialize menu service
    yield* menuService.createApplicationMenu
    // yield* globalShortcutService.initialize

    // Initialize ccusage sync in background
    log.info('[MAIN] 📢 Publishing AppReady event')
    yield* pubsub.publish(createAppReady())

    yield* Effect.fork(initializeCcusageSync)

    // Initialize Claude Code auth checking in background
    yield* Effect.fork(initializeClaudeCodeAuth)

    log.info('[MAIN] ✅ Background services started')

    // Send app ready event to trigger SSR demo - only after everything is successfully initialized

    yield* Effect.never
  } catch (error) {
    log.error('[MAIN] ❌ Critical error in main program:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Try to publish error message if pubsub is available
    try {
      const pubsub = yield* PubSubClient
      yield* pubsub.publish(
        createAppReady(true, `Application initialization failed: ${errorMessage}`)
      )
    } catch (pubsubError) {
      log.error('[MAIN] ❌ Failed to publish AppReady error message:', pubsubError)
    }

    return yield* Effect.fail(error)
  } finally {
    yield* Effect.logInfo('Main program exiting')
    log.info('[MAIN] 🔚 Main program exiting')
  }
})

// Error handling
const main = program.pipe(
  Effect.catchTags({
    // Handle specific error types if needed
  }),
  Effect.catchAll((error) => {
    log.error('[MAIN] ❌ Unhandled error in main program:', error)

    // Try to send error message to renderer
    return Effect.gen(function* () {
      try {
        const pubsub = yield* PubSubClient
        const errorMessage = error instanceof Error ? error.message : String(error)
        yield* pubsub.publish(createAppReady(true, `Application startup failed: ${errorMessage}`))
      } catch (pubsubError) {
        log.error('[MAIN] ❌ Failed to publish error message:', pubsubError)
      }

      return yield* Effect.fail(error)
    })
  })
)

export function initApp() {
  log.info('[MAIN] 🚀 initApp() called - starting SlideRuntime')
  
  try {
    log.info('[MAIN] 🔄 Creating config provider...')
    const configProvider = config.viteConfigProvider()
    log.info('[MAIN] ✅ Config provider created')
    
    log.info('[MAIN] 🔄 Creating main effect with config...')
    const mainWithConfig = Effect.withConfigProvider(main, configProvider)
    log.info('[MAIN] ✅ Main effect configured')
    
    log.info('[MAIN] 🔄 Running SlideRuntime.runPromise...')
    SlideRuntime.runPromise(mainWithConfig)
      .then(() => {
        log.info('[MAIN] ✅ SlideRuntime.runPromise completed successfully')
      })
      .catch((error) => {
        log.error('[MAIN] ❌ Error in SlideRuntime.runPromise:', error)
        log.error('[MAIN] ❌ Error stack:', error?.stack)
        log.error('[MAIN] ❌ Error details:', JSON.stringify(error, null, 2))

        // Clean up runtime on error
        SlideRuntime.dispose().catch((disposeError) => {
          log.error('[MAIN] ❌ Error disposing runtime after main error:', disposeError)
        })
      })
  } catch (syncError) {
    log.error('[MAIN] ❌ Synchronous error in initApp:', syncError)
    log.error('[MAIN] ❌ Sync error stack:', syncError?.stack)
    log.error('[MAIN] ❌ Sync error details:', JSON.stringify(syncError, null, 2))
  }
}
