import { Effect } from 'effect'
import { BaseWindow, WebContentsView, app } from 'electron'
import log from 'electron-log'
import { listenTo } from '../utils/listenTo.js'
import { createRequire } from 'node:module'
import { markAppReady, AppReadyRef } from '../refs/ipc/app-ready.ref.js'
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
    yield* Effect.logInfo('🚀 Starting AppLaunchedFlow')
    log.info('[FLOW] 🚀 AppLaunchedFlow triggered')

    // Check if the AppReady message contains an error
    if (message.error) {
      yield* Effect.logError('❌ AppReady message contains error')
      log.error('[FLOW] ❌ AppReady error:', message.errorDetails)

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

    // Set up webview preload script injection
    app.on('web-contents-created', (_event, contents) => {
      contents.on('will-attach-webview', (_wawevent, webPreferences, _params) => {
        log.info('[FLOW] WILLATTACHPRELOAD')
        try {
          // Resolve the preload script path
          // const preloadPath = resolve('@slide.code/preload/dist/webview-preload.mjs')
          // webPreferences.preload = `file://${preloadPath}`
          webPreferences.preload = resolve('@slide.code/preload/webview-preload')

          log.info('[FLOW] 🔧 Webview preload script injected:')
        } catch (error) {
          log.error('[FLOW] ❌ Failed to resolve webview preload script:', error)
        }
      })
    })

    // Note: ccusage and Claude Code auth are now handled by background services
    // that were started during app initialization. They will run periodically
    // and update the user state automatically.

    try {
      // Create the base window
      const baseWindow = new BaseWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 15, y: 15 }
      })

      // Create the WebContentsView
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

      // Set the view for the window
      baseWindow.setContentView(webContentsView)

      // Set initial bounds
      const bounds = baseWindow.getBounds()
      webContentsView.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height })

      // Show the window
      baseWindow.show()

      // Load the renderer based on environment
      yield* Effect.if(process.env.MODE === 'development' && !!process.env.VITE_DEV_SERVER_URL, {
        onTrue: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadURL(process.env.VITE_DEV_SERVER_URL!)
          ).pipe(Effect.tap(() => Effect.logInfo('Loaded from Vite Dev Server'))),
        onFalse: () =>
          Effect.promise(() =>
            webContentsView.webContents.loadFile(resolve('@slide.code/app'))
          ).pipe(Effect.tap(() => Effect.logInfo('Loaded from file')))
      })

      // webContentsView.webContents.loadFile(resolve('@slide.code/app'))

      // webContentsView.webContents.openDevTools()

      yield* markAppReady
      log.info('[FLOW] ✅ App ready')

      // Handle window closed event and cleanup WebContentsView
      baseWindow.on('closed', () => {
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

      return true
    } catch (error) {
      yield* Effect.logError(`Error creating BaseWindow: ${error}`)
      log.error('[FLOW] ❌ Error creating BaseWindow:', error)
      return Effect.fail(`Failed to create BaseWindow: ${error}`)
    }
  })
)
