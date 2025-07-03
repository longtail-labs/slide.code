import fixPath from 'fix-path'

// Fix the PATH environment variable for macOS packaged apps
// This must be the first thing to run
fixPath()

import { app, globalShortcut, BrowserWindow, dialog } from 'electron'
import {
  configurePerformanceOptimizations,
  ensureSingleInstance,
  SlideRuntime,
  UpdateRef,
  config,
  MenuService,
  PubSubClient,
  ElectronEventService,
  PostHogService,
  registerSSRProtocols,
  GlobalShortcutService,
  registerDeepLinkingProtocol,
  createVibeDir,
  UserRef,
  DatabaseService
} from '@slide.code/core'
import { Effect, Fiber, Match, Stream } from 'effect'
import path from 'path'
import log from 'electron-log'

import { createAppReady } from '@slide.code/schema/messages'

log.info('[MAIN] 🚀 Starting SlideCode main process')
log.info('[MAIN] 📍 Current working directory:', process.cwd())
log.info('[MAIN] 🔧 Node version:', process.version)
log.info('[MAIN] 🔧 Electron version:', process.versions.electron)
log.info('[MAIN] 📦 App version:', app.getVersion())

// Global references to prevent garbage collection
let eventHandlerFiber: Fiber.RuntimeFiber<any, any> | null = null

// Using the generator approach with Effect.gen
const program = Effect.gen(function* () {
  try {
    log.info('[MAIN] 🔄 Starting main program execution')

    // First register SSR protocols before app is ready and any service initialization
    log.info('[MAIN] 🔗 Registering SSR protocols')
    yield* registerSSRProtocols
    log.info('[MAIN] ✅ SSR protocols registered')

    // Register custom protocol for deep linking
    log.info('[MAIN] 🔗 Registering deep linking protocol')
    yield* registerDeepLinkingProtocol
    log.info('[MAIN] ✅ Deep linking protocol registered')

    // Get services (these are now scoped to the runtime)
    log.info('[MAIN] 🛠️ Initializing services')
    // const sentry = yield* SentryService
    const update = yield* UpdateRef
    const menuService = yield* MenuService
    const pubsub = yield* PubSubClient
    const electronEventService = yield* ElectronEventService // Get the electron event service
    const posthog = yield* PostHogService // Get the PostHog service
    const userRef = yield* UserRef
    const dbService = yield* DatabaseService
    log.info('[MAIN] ✅ Services initialized')

    // const globalShortcutService = yield* GlobalShortcutService
    yield* Effect.logInfo('Initializing ElectronEventService')
    log.info('[MAIN] 🔄 Initializing ElectronEventService')
    yield* electronEventService.initialize
    log.info('[MAIN] ✅ ElectronEventService initialized')

    // Then do other performance optimizations and instance checks
    log.info('[MAIN] ⚡ Applying performance optimizations and checking single instance')
    yield* Effect.all([configurePerformanceOptimizations, ensureSingleInstance])
    log.info('[MAIN] ✅ Performance optimizations applied and single instance ensured')

    // Create vibe-dir and save path to user ref
    log.info('[MAIN] 📁 Creating vibe directory')
    const vibeDir = yield* createVibeDir
    yield* userRef.updateVibeDirectory(vibeDir)
    log.info('[MAIN] ✅ Vibe directory created:', vibeDir)

    // Get configuration using Effect Config
    yield* Effect.logInfo('Loading configuration')
    log.info('[MAIN] ⚙️ Loading configuration')
    const updateConfig = yield* config.updateConfig
    const posthogConfig = yield* config.posthogConfig
    const sentryConfig = yield* config.sentryConfig
    const dbConfig = yield* config.databaseConfig
    log.info('[MAIN] ✅ Configuration loaded')

    // Initialize PostHog if API key is available
    if (posthogConfig.apiKey) {
      yield* Effect.logInfo('Initializing PostHog')
      log.info('[MAIN] 📊 Initializing PostHog')
      yield* posthog.initialize({
        ...posthogConfig,
        apiKey: posthogConfig.apiKey
      })

      yield* posthog.captureAppLaunched()
      log.info('[MAIN] ✅ PostHog initialized and app launch captured')
    } else {
      yield* Effect.logInfo('Skipping PostHog initialization - API key not provided')
      log.info('[MAIN] ⚠️ Skipping PostHog initialization - API key not provided')
    }

    // Wait for app to be ready before proceeding
    log.info('[MAIN] ⏳ Waiting for Electron app to be ready')
    yield* Effect.promise(() => app.whenReady())
    yield* Effect.logInfo('📱 App ready, starting up')
    log.info('[MAIN] ✅ Electron app is ready, continuing startup')

    // Initialize the update service
    if (updateConfig.updateSiteURL) {
      yield* Effect.logInfo('Initializing UpdateService', updateConfig)
      log.info('[MAIN] 🔄 Initializing UpdateService with URL:', updateConfig.updateSiteURL)
      yield* update.initialize({
        updateSiteURL: updateConfig.updateSiteURL,
        checkInterval: updateConfig.checkInterval,
        automaticChecks: updateConfig.automaticChecks
      })
      log.info('[MAIN] ✅ UpdateService initialized')
    } else {
      yield* Effect.logInfo('Skipping UpdateService initialization - no URL provided')
      log.info('[MAIN] ⚠️ Skipping UpdateService initialization - no URL provided')
    }

    try {
      // Initialize and run migrations in one step
      log.info('[MAIN] 🗄️ Initializing database and running migrations', dbConfig)
      yield* dbService.initAndMigrate(dbConfig)
      log.info('[MAIN] ✅ Database initialized and migrated successfully')
      // logger.info('Database initialized and migrated successfully')
    } catch (error) {
      // logger.error('Database initialization failed:', error)
      log.error('[MAIN] ❌ Database initialization failed:', error)
      // actions.initFail(`Failed to initialize database. Please restart the application. ${error}`)
      return yield* Effect.fail(error)
    }

    // Handle app events using the ElectronEventService
    log.info('[MAIN] 🔄 Setting up event handler stream')
    const eventHandler = electronEventService.stream.pipe(
      Stream.tap((event) => Effect.logInfo(`🔄 Processing event: ${event._tag}`)),
      Stream.tap((event) =>
        Effect.sync(() => console.log('🔄 Processing event', JSON.stringify(event, null, 2)))
      ),
      Stream.tap((event) => Effect.sync(() => log.info('[MAIN] 🔄 Processing event:', event._tag))),
      Stream.runForEach((event) => {
        return Effect.gen(function* () {
          yield* Effect.logInfo(`Handling electron event: ${event._tag}`, event)
          log.info('[MAIN] 🔄 Handling electron event:', event._tag)

          return yield* Match.value(event._tag).pipe(
            Match.when('window-all-closed', () =>
              Effect.gen(function* () {
                // if (process.platform !== 'darwin') {
                yield* Effect.logInfo('Quitting app on window-all-closed (non-Darwin platform)')
                app.quit()
                app.exit(0)
                // }
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
    yield* Effect.logInfo('🚀 Event handler started')
    log.info('[MAIN] ✅ Event handler started and forked')

    // Initialize menu service
    log.info('[MAIN] 🍔 Creating application menu')
    yield* menuService.createApplicationMenu
    log.info('[MAIN] ✅ Application menu created')
    // yield* globalShortcutService.initialize

    // Send app ready event to trigger SSR demo
    log.info('[MAIN] 📢 Publishing AppReady event')
    yield* pubsub.publish(createAppReady())
    log.info('[MAIN] ✅ AppReady event published')

    // yield* subscription.openCheckout('price_1RCoB1QQ3xOop9wog1ScGOe1')

    // yield* subscription.refreshSubscriptionStatus

    // yield* auth.loginOrCreateAccount()
    // yield* auth.refreshTokens
    // yield* auth.createBillingPortal()
    // yield* api.tapAuthData()
    // yield* auth.refreshTokens
    // yield* api.createStripeCustomer()

    // Add proper error handling for API calls
    // const emojiResult = yield* api.getEmojiForTask('Build a rocket')
    // console.log('Emoji:', emojiResult)

    // const stripeCustomer = yield* api.createStripeCustomer()
    // console.log('Stripe customer:', stripeCustomer)

    yield* Effect.never
  } finally {
    yield* Effect.logInfo('Main program exiting')
    log.info('[MAIN] 🔚 Main program exiting')
  }
})

// Error handling
const main = program.pipe(Effect.catchTags({}))

export function initApp() {
  SlideRuntime.runPromise(Effect.withConfigProvider(program, config.viteConfigProvider())).catch(
    (error) => {
      console.error('Error in main', error)

      // Clean up runtime on error
      SlideRuntime.dispose().catch((disposeError) => {
        console.error('Error disposing runtime after main error:', disposeError)
      })
    }
  )
}
