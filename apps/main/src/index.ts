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
  SentryService,
  registerSSRProtocols,
  GlobalShortcutService,
  registerDeepLinkingProtocol,
  createVibeDir,
  UserRef
} from '@slide.code/core'
import { Effect, Fiber, Match, Stream } from 'effect'
import path from 'path'
import log from 'electron-log'

import { createAppReady } from '@slide.code/schema/messages'

// Global references to prevent garbage collection
let eventHandlerFiber: Fiber.RuntimeFiber<any, any> | null = null

// Using the generator approach with Effect.gen
const program = Effect.gen(function* () {
  try {
    // First register SSR protocols before app is ready and any service initialization
    yield* registerSSRProtocols

    // Register custom protocol for deep linking
    yield* registerDeepLinkingProtocol

    // Get services (these are now scoped to the runtime)
    // const sentry = yield* SentryService
    const update = yield* UpdateRef
    const menuService = yield* MenuService
    const pubsub = yield* PubSubClient
    const electronEventService = yield* ElectronEventService // Get the electron event service
    const posthog = yield* PostHogService // Get the PostHog service
    const sentry = yield* SentryService
    const userRef = yield* UserRef
    // const globalShortcutService = yield* GlobalShortcutService
    yield* Effect.logInfo('Initializing ElectronEventService')
    yield* electronEventService.initialize

    // Then do other performance optimizations and instance checks
    yield* Effect.all([configurePerformanceOptimizations, ensureSingleInstance])

    // Create vibe-dir and save path to user ref
    const vibeDir = yield* createVibeDir
    yield* userRef.updateVibeDirectory(vibeDir)

    // Get configuration using Effect Config
    yield* Effect.logInfo('Loading configuration')
    const updateConfig = yield* config.updateConfig
    const posthogConfig = yield* config.posthogConfig
    const sentryConfig = yield* config.sentryConfig

    // Only initialize Sentry if DSN is available
    if (sentryConfig.dsn) {
      yield* Effect.logInfo('Initializing Sentry with DSN', sentryConfig.dsn)
      yield* sentry.initialize({
        ...sentryConfig,
        dsn: sentryConfig.dsn
      })
    } else {
      yield* Effect.logInfo('Skipping Sentry initialization - DSN not provided')
    }

    // Initialize PostHog if API key is available
    if (posthogConfig.apiKey) {
      yield* Effect.logInfo('Initializing PostHog')
      yield* posthog.initialize({
        ...posthogConfig,
        apiKey: posthogConfig.apiKey
      })

      yield* posthog.captureAppLaunched()
    } else {
      yield* Effect.logInfo('Skipping PostHog initialization - API key not provided')
    }

    // Wait for app to be ready before proceeding
    yield* Effect.promise(() => app.whenReady())
    yield* Effect.logInfo('📱 App ready, starting up')

    // Initialize the update service
    if (updateConfig.updateSiteURL) {
      yield* Effect.logInfo('Initializing UpdateService', updateConfig)
      yield* update.initialize({
        updateSiteURL: updateConfig.updateSiteURL,
        checkInterval: updateConfig.checkInterval,
        automaticChecks: updateConfig.automaticChecks
      })
    } else {
      yield* Effect.logInfo('Skipping UpdateService initialization - no URL provided')
    }

    // Handle app events using the ElectronEventService
    const eventHandler = electronEventService.stream.pipe(
      Stream.tap((event) => Effect.logInfo(`🔄 Processing event: ${event._tag}`)),
      Stream.tap((event) =>
        Effect.sync(() => console.log('🔄 Processing event', JSON.stringify(event, null, 2)))
      ),
      Stream.runForEach((event) => {
        return Effect.gen(function* () {
          yield* Effect.logInfo(`Handling electron event: ${event._tag}`, event)

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

    // Initialize menu service
    yield* menuService.createApplicationMenu
    // yield* globalShortcutService.initialize

    // Send app ready event to trigger SSR demo
    yield* pubsub.publish(createAppReady())

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
