import { Effect, Queue } from 'effect'
import { BaseWindow } from 'electron'
import { BaseWindowWrapper, type WindowEvent } from './base-window.wrapper.js'
import { ElectronEventService } from '../../services/electron-app.service.js'

/**
 * Options for creating a BaseWindow
 */
export type BaseWindowOptions = Electron.BaseWindowConstructorOptions

/**
 * Creates a BaseWindow resource
 *
 * @param options - The options for creating the BaseWindow
 * @returns An Effect that acquires and releases a BaseWindowWrapper
 */
export const makeBaseWindow = (options: BaseWindowOptions) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      // Wait for Electron app to be ready
      // const electronService = yield* ElectronEventService
      // yield* electronService.whenReady

      yield* Effect.logInfo('Creating BaseWindow', options)

      // Create event queue
      const eventQueue = yield* Queue.bounded<WindowEvent>(100)

      // Create the window
      const window = new BaseWindow(options)
      return new BaseWindowWrapper(window, eventQueue)
    }),
    (wrapper) =>
      Effect.sync(() => {
        Effect.logInfo('Closing BaseWindow and its resources')
        wrapper.cleanup()
      })
  )

// Static window management functions
export const getAllWindows = Effect.sync(() => BaseWindow.getAllWindows())
export const getFocusedWindow = Effect.sync(() => BaseWindow.getFocusedWindow())
export const getWindowById = (id: number) => Effect.sync(() => BaseWindow.fromId(id))
export const closeAllWindows = Effect.sync(() => {
  const windows = BaseWindow.getAllWindows()
  windows.forEach((window) => {
    if (!window.isDestroyed()) {
      window.close()
    }
  })
})
export const minimizeAllWindows = Effect.sync(() => {
  const windows = BaseWindow.getAllWindows()
  windows.forEach((window) => {
    if (!window.isDestroyed() && window.minimizable) {
      window.minimize()
    }
  })
})
export const restoreAllWindows = Effect.sync(() => {
  const windows = BaseWindow.getAllWindows()
  windows.forEach((window) => {
    if (!window.isDestroyed() && window.isMinimized()) {
      window.restore()
    }
  })
})
export const hasAnyWindowFocused = Effect.sync(() => BaseWindow.getFocusedWindow() !== null)
export const getWindowCount = Effect.sync(() => BaseWindow.getAllWindows().length)
export const windowExists = (id: number) =>
  Effect.sync(() => {
    const window = BaseWindow.fromId(id)
    return window !== null && !window.isDestroyed()
  })
