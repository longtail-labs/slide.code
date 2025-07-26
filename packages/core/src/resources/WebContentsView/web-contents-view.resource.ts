import { Effect, Queue } from 'effect'
import { WebContentsView, webContents } from 'electron'
import { WebContentsViewWrapper, type WebContentsViewEvent } from './web-contents-view.wrapper.js'
// import { ElectronEventService } from '../../services/electron-app.service.js'
import { partition } from '../../values.js'
/**
 * WebContentsView options
 */
export type WebContentsViewOptions = Electron.WebContentsViewConstructorOptions

/**
 * Creates a WebContentsView resource
 *
 * @param options - The options for creating the WebContentsView
 * @returns An Effect that acquires and releases a WebContentsViewWrapper
 */
export const makeWebContentsView = (options?: WebContentsViewOptions) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      // Wait for Electron app to be ready
      // const electronService = yield* ElectronEventService
      // yield* electronService.whenReady

      yield* Effect.logInfo('Creating WebContentsView', options)

      // Create event queue for WebContentsViewEvents
      const eventQueue = yield* Queue.bounded<WebContentsViewEvent>(100)

      const mergedOptions = {
        ...options,
        partition,
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
        sandbox: false,
        webviewTag: false
      }

      // Create the view
      const view = new WebContentsView(mergedOptions)

      // Return a wrapped view
      return new WebContentsViewWrapper(view, eventQueue)
    }),
    (wrapper) =>
      Effect.sync(() => {
        console.log('DEBUGWEBCONTENTSVIEWRESOURCECLEANUP')
        Effect.logInfo('Cleaning up WebContentsView resources')
        wrapper.cleanup()
      })
  )

/**
 * Loads a URL in a WebContentsView
 *
 * @param wrapper - The WebContentsViewWrapper to load the URL in
 * @param url - The URL to load
 * @param options - The options for loading the URL
 * @returns An Effect that loads the URL
 */
export const loadURL = (
  wrapper: WebContentsViewWrapper,
  url: string,
  options?: Electron.LoadURLOptions
) => wrapper.loadURL(url, options)

/**
 * Loads a local file in a WebContentsView
 *
 * @param wrapper - The WebContentsViewWrapper to load the file in
 * @param filePath - The path to the file to load
 * @param options - The options for loading the file
 * @returns An Effect that loads the file
 */
export const loadFile = (
  wrapper: WebContentsViewWrapper,
  filePath: string,
  options?: Electron.LoadFileOptions
) => wrapper.loadFile(filePath, options)

/**
 * Static methods for working with WebContents
 */
export const getAllWebContents = Effect.sync(() => webContents.getAllWebContents())
export const getFocusedWebContents = Effect.sync(() => webContents.getFocusedWebContents())
export const fromId = (id: number) => Effect.sync(() => webContents.fromId(id))
export const fromDevToolsTargetId = (targetId: string) =>
  Effect.sync(() => webContents.fromDevToolsTargetId(targetId))
