import { Effect } from 'effect'
import { BaseWindowWrapper } from './BaseWindow/index.js'
import { makeWebContentsView } from './WebContentsView/index.js'
import { createRequire } from 'node:module'
import { LAYOUT_CONSTANTS } from '../values.js'
const require = createRequire(import.meta.url)
const resolve = require.resolve

/**
 * Creates a widget for the left sidebar
 */
export const createLeftSidebar = (
  parentWindow: BaseWindowWrapper,
  taskId: string,
  width: number = LAYOUT_CONSTANTS.SIDEBAR_LEFT_WIDTH
) =>
  Effect.gen(function* () {
    const leftSidebar = yield* makeWebContentsView({
      webPreferences: {
        // preload: resolve('@polka/preload'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
        sandbox: false,
        webviewTag: false
      }
    })

    // Add to the window
    parentWindow.addView(leftSidebar)

    // Set bounds and position
    const bounds = yield* parentWindow.getBounds()
    yield* leftSidebar.setBounds({ x: 0, y: 0, width, height: bounds.height })

    // Load content
    yield* leftSidebar.loadFile(resolve('@polka/task-sidebar'), {
      query: { taskId: taskId }
    })

    // yield* leftSidebar.openDevTools({ mode: 'detach' })

    return leftSidebar
  })

/**
 * Creates a toast component for notifications
 */
export const createToast = (parentWindow: BaseWindowWrapper) =>
  Effect.gen(function* () {
    const toast = yield* makeWebContentsView({
      webPreferences: {
        // preload: resolve('@polka/preload'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
        sandbox: false,
        webviewTag: false,
        transparent: true
      }
    })

    // Add to the window with high z-index
    parentWindow.addView(toast)

    // Position at bottom right
    const bounds = yield* parentWindow.getBounds()
    const toastWidth = 350
    const toastHeight = 100
    const padding = 20

    yield* toast.setBounds({
      x: bounds.width - toastWidth - padding,
      y: bounds.height - toastHeight - padding,
      width: toastWidth,
      height: toastHeight
    })

    // Make invisible initially
    toast.view.setVisible(false)

    return toast
  })

/**
 * Creates a context menu component
 */
export const createContextMenu = (parentWindow: BaseWindowWrapper, taskId: string) =>
  Effect.gen(function* () {
    const contextMenu = yield* makeWebContentsView({
      webPreferences: {
        // preload: resolve('@polka/preload'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
        sandbox: false
      }
    })

    // Add to the window
    parentWindow.addView(contextMenu)

    yield* contextMenu.setBounds({
      x: 0,
      y: 0,
      width: 310,
      height: 375
    })

    // Make invisible initially
    contextMenu.view.setVisible(false)

    return contextMenu
  })

/**
 * Creates an action bar component
 */
export const createActionBar = (parentWindow: BaseWindowWrapper, taskId: string) =>
  Effect.gen(function* () {
    const actionBar = yield* makeWebContentsView({
      webPreferences: {
        // preload: resolve('@polka/preload'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: true,
        sandbox: false,
        webviewTag: false
      }
    })

    // Add to the window
    parentWindow.addView(actionBar)

    // Set initial bounds to center
    const bounds = yield* parentWindow.getBounds()
    const actionBarWidth = 600
    const actionBarHeight = 400

    yield* actionBar.setBounds({
      x: (bounds.width - actionBarWidth) / 2,
      y: (bounds.height - actionBarHeight) / 2,
      width: actionBarWidth,
      height: actionBarHeight
    })

    // Make invisible initially
    actionBar.view.setVisible(false)

    return actionBar
  })

/**
 * Create all task UI components and return them
 */
export const createTaskComponents = (parentWindow: BaseWindowWrapper, taskId: string) =>
  Effect.gen(function* () {
    // Create the left sidebar widget
    const leftSidebar = yield* createLeftSidebar(parentWindow, taskId)

    // Create toast for notifications
    const toast = yield* createToast(parentWindow)

    // Create context menu
    const contextMenu = yield* createContextMenu(parentWindow, taskId)

    // Create action bar
    const actionBar = yield* createActionBar(parentWindow, taskId)

    return {
      leftSidebar,
      toast,
      contextMenu,
      actionBar
    }
  })
