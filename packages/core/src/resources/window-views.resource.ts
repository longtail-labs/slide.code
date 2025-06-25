import { Effect } from 'effect'

import { makeBaseWindow, type BaseWindowOptions } from './BaseWindow/index.js'

import {
  makeWebContentsView,
  type WebContentsViewOptions,
  type WebContentsViewWrapper,
  loadURL
} from './WebContentsView/index.js'

/**
 * Creates a window with a single WebContentsView that fills the entire window
 *
 * @param windowOptions - Options for creating the BaseWindow
 * @param viewOptions - Options for creating the WebContentsView
 * @returns An Effect that creates a window with a view
 */
export const makeWindow = (
  windowOptions: BaseWindowOptions,
  viewOptions: WebContentsViewOptions | undefined
) =>
  Effect.gen(function* () {
    // Create the window
    const windowWrapper = yield* makeBaseWindow(windowOptions)

    // Create the view
    const viewWrapper = yield* makeWebContentsView(viewOptions)

    // Add the view to the window
    windowWrapper.addView(viewWrapper)

    // Set the view to fill the entire window
    const { width = 800, height = 600 } = windowOptions
    yield* viewWrapper.setBounds({ x: 0, y: 0, width, height })

    return {
      window: windowWrapper,
      view: viewWrapper
    }
  })

/**
 * Creates a window with a split view (two WebContentsViews side by side)
 *
 * @param windowOptions - Options for creating the BaseWindow
 * @param leftViewOptions - Options for creating the left WebContentsView
 * @param rightViewOptions - Options for creating the right WebContentsView
 * @param leftUrl - URL to load in the left view
 * @param rightUrl - URL to load in the right view
 * @returns An Effect that creates a window with split views
 */
export const makeSplitViewWindow = (
  windowOptions: BaseWindowOptions,
  leftViewOptions: WebContentsViewOptions | undefined,
  rightViewOptions: WebContentsViewOptions | undefined,
  leftUrl: string,
  rightUrl: string
) =>
  Effect.gen(function* () {
    // Create the window
    const windowWrapper = yield* makeBaseWindow(windowOptions)

    // Create views
    const leftViewWrapper = yield* makeWebContentsView(leftViewOptions)
    const rightViewWrapper = yield* makeWebContentsView(rightViewOptions)

    // Add views to window
    windowWrapper.addView(leftViewWrapper)
    windowWrapper.addView(rightViewWrapper)

    // Set the bounds for the split view
    const { width = 800, height = 600 } = windowOptions

    windowWrapper.setViewBounds(leftViewWrapper, {
      x: 0,
      y: 0,
      width: Math.floor(width / 2),
      height
    })

    windowWrapper.setViewBounds(rightViewWrapper, {
      x: Math.floor(width / 2),
      y: 0,
      width: Math.floor(width / 2),
      height
    })

    // Load URLs
    yield* loadURL(leftViewWrapper, leftUrl)
    yield* loadURL(rightViewWrapper, rightUrl)

    return {
      window: windowWrapper,
      leftView: leftViewWrapper,
      rightView: rightViewWrapper
    }
  })

/**
 * Create a setup for using DevTools in a separate window
 *
 * @param targetView - The WebContentsViewWrapper to debug
 * @param devToolsWindowOptions - Options for creating the DevTools window
 * @returns An Effect that sets up DevTools in a separate window
 */
export const makeDevToolsWindow = (
  targetView: WebContentsViewWrapper,
  devToolsWindowOptions: BaseWindowOptions
) =>
  Effect.gen(function* () {
    // Create the DevTools window
    const devToolsWindowWrapper = yield* makeBaseWindow(devToolsWindowOptions)

    // Create a view for the DevTools window
    const devToolsViewWrapper = yield* makeWebContentsView()

    // Add the view to the window and make it fill the window
    devToolsWindowWrapper.addView(devToolsViewWrapper)

    const { width = 800, height = 600 } = devToolsWindowOptions
    devToolsViewWrapper.setBounds({ x: 0, y: 0, width, height })

    // Set the DevTools webContents and open DevTools
    yield* targetView.setDevToolsWebContents(devToolsViewWrapper.view.webContents)
    // yield* targetView.openDevTools({ mode: 'detach' })

    // Show the window
    yield* devToolsWindowWrapper.show()

    return {
      window: devToolsWindowWrapper,
      view: devToolsViewWrapper
    }
  })
