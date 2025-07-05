import { Effect, Duration, Scope } from 'effect'
import { BaseWindow, WebContentsView } from 'electron'
import log from 'electron-log'
import { listenTo } from '../utils/listenTo.js'
import { createRequire } from 'node:module'
import { PubSubClient } from '../services/pubsub.service.js'
import { markAppReady, AppReadyRef } from '../refs/ipc/app-ready.ref.js'
import {
  createSetWindowTitle,
  createGetAppInfo,
  createShowUpdateDialog,
  createInvalidateQuery,
  createTaskStart
} from '@slide.code/schema/messages'
import { UserRef } from '../refs/ipc/user.ref.js'
import { DatabaseService, DatabaseServiceLive } from '../services/database.service.js'
import type { TaskInsert, ChatMessageInsert } from '@slide.code/schema'
import type { AppReadyState } from '@slide.code/schema/state'

const require = createRequire(import.meta.url)
const resolve = require.resolve

/**
 * Combined flow that handles app launch and task work
 * Uses route navigation instead of separate windows
 * Tests all communication systems: RPC, PubSub, and IPCRef
 */
export const AppLaunchedFlow = listenTo('AppReady', 'AppLaunchedFlow', (message) =>
  Effect.gen(function* () {
    yield* Effect.logInfo('🚀 Starting AppLaunchedFlow - Creating BaseWindow', message._tag)
    log.info('[FLOW] 🚀 AppLaunchedFlow triggered with message:', message._tag)
    log.info('[FLOW] 📱 Starting BaseWindow creation process')

    // Check if the AppReady message contains an error
    if (message.error) {
      yield* Effect.logError('❌ AppReady message contains error, updating app state')
      log.error('[FLOW] ❌ AppReady message contains error:', message.errorDetails)

      // Update app ready state with error information
      const appReadyRef = yield* AppReadyRef
      yield* appReadyRef.update((state: AppReadyState) => ({
        ...state,
        isReady: false,
        error: true,
        errorDetails: message.errorDetails || 'Unknown error',
        timestamp: Date.now()
      }))
    }

    // Get services for UI creation
    log.info('[FLOW] 🛠️ Obtaining services for UI creation')
    const pubsub = yield* PubSubClient
    const userRef = yield* UserRef
    log.info('[FLOW] ✅ Services obtained successfully')

    // Note: ccusage and Claude Code auth are now handled by background services
    // that were started during app initialization. They will run periodically
    // and update the user state automatically.

    try {
      // Create the base window
      log.info('[FLOW] 🪟 Creating BaseWindow')
      const baseWindow = new BaseWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 }
      })

      yield* Effect.logInfo('BaseWindow created successfully')
      log.info('[FLOW] ✅ BaseWindow created successfully')

      // Create the WebContentsView
      log.info('[FLOW] 🌐 Creating WebContentsView')
      const webContentsView = new WebContentsView({
        webPreferences: {
          preload: resolve('@slide.code/preload'),
          nodeIntegration: false,
          contextIsolation: true,
          webviewTag: true,
          sandbox: false,
          webSecurity: false // Disable for local file access
        }
      })

      yield* Effect.logInfo('WebContentsView created successfully')
      log.info('[FLOW] ✅ WebContentsView created successfully')

      // Set the view for the window
      log.info('[FLOW] 🔧 Setting WebContentsView for BaseWindow')
      baseWindow.setContentView(webContentsView)

      // Set initial bounds
      const bounds = baseWindow.getBounds()
      webContentsView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })

      // Show the window
      log.info('[FLOW] 👁️ Showing BaseWindow')
      baseWindow.show()

      // Load the renderer based on environment
      log.info('[FLOW] 🔧 Loading renderer content')

      yield* Effect.if(process.env.MODE === 'development' && !!process.env.VITE_DEV_SERVER_URL, {
        onTrue: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadURL(process.env.VITE_DEV_SERVER_URL!)
          ).pipe(
            Effect.tap(() => Effect.logInfo('Loaded from Vite Dev Server')),
            Effect.tap(() => log.info('[FLOW] ✅ Content loaded from Vite Dev Server'))
          ),
        onFalse: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadFile(resolve('@slide.code/app'))
          ).pipe(
            Effect.tap(() => Effect.logInfo('Loaded from file')),
            Effect.tap(() => log.info('[FLOW] ✅ Content loaded from file'))
          )
      })

      // webContentsView.webContents.loadFile(resolve('@slide.code/app'))

      log.info('[FLOW] 🔧 Opening DevTools for debugging')
      // webContentsView.webContents.openDevTools()

      // Sleep briefly to ensure window is ready
      log.info('[FLOW] ⏳ Waiting 5 seconds for window to be ready')
      // yield* Effect.sleep(Duration.millis(5000))
      console.log('MARKING APP READY')
      log.info('[FLOW] ✅ Window ready, marking app as ready')

      yield* markAppReady
      log.info('[FLOW] ✅ App marked as ready successfully')

      // Handle window closed event and cleanup WebContentsView
      baseWindow.on('closed', () => {
        log.info('[FLOW] BaseWindow closed, cleaning up WebContentsView')
        if (!webContentsView.webContents.isDestroyed()) {
          webContentsView.webContents.close()
        }
      })

      // Handle window resize to update view bounds
      baseWindow.on('resized', () => {
        const bounds = baseWindow.getBounds()
        webContentsView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })
      })

      yield* Effect.logInfo('BaseWindow created and app loaded successfully')
      log.info('[FLOW] ✅ BaseWindow created and app loaded successfully')

      return true
    } catch (error) {
      yield* Effect.logError(`Error creating BaseWindow: ${error}`)
      log.error('[FLOW] ❌ Error creating BaseWindow:', error)
      return Effect.fail(`Failed to create BaseWindow: ${error}`)
    }
  })
)
