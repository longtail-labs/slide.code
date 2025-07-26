import { Effect, Stream, Queue, Schema } from 'effect'
import { BaseWindow } from 'electron'
import { WebContentsViewWrapper } from '../WebContentsView/web-contents-view.wrapper.js'

/**
 * Type representing different window events
 */
export type WindowEvent =
  | { _tag: 'close'; event: Electron.Event }
  | { _tag: 'closed' }
  | { _tag: 'blur'; event: Electron.Event }
  | { _tag: 'focus'; event: Electron.Event }
  | { _tag: 'show' }
  | { _tag: 'hide' }
  | { _tag: 'maximize' }
  | { _tag: 'unmaximize' }
  | { _tag: 'minimize' }
  | { _tag: 'restore' }
  | { _tag: 'resize'; bounds: { width: number; height: number } }
  | { _tag: 'resized' }
  | {
      _tag: 'will-resize'
      event: Electron.Event
      newBounds: Electron.Rectangle
      details: { edge: string }
    }
  | { _tag: 'move'; position: { x: number; y: number } }
  | { _tag: 'moved' }
  | { _tag: 'will-move'; event: Electron.Event; newBounds: Electron.Rectangle }
  | { _tag: 'enter-full-screen' }
  | { _tag: 'leave-full-screen' }
  | { _tag: 'always-on-top-changed'; event: Electron.Event; isAlwaysOnTop: boolean }
  | { _tag: 'app-command'; event: Electron.Event; command: string }
  | { _tag: 'swipe'; event: Electron.Event; direction: string }
  | { _tag: 'rotate-gesture'; event: Electron.Event; rotation: number }
  | { _tag: 'sheet-begin' }
  | { _tag: 'sheet-end' }
  | { _tag: 'new-window-for-tab' }
  | { _tag: 'system-context-menu'; event: Electron.Event; point: { x: number; y: number } }

/**
 * Errors that can be thrown by the BaseWindow resource
 */
export class BaseWindowError extends Error {
  readonly _tag = 'BaseWindowError'

  constructor(message: string) {
    super(message)
    this.name = 'BaseWindowError'
  }
}

/**
 * Type for window bounds (partial rectangle)
 */
export type WindowBounds = Partial<Electron.Rectangle>

/**
 * A wrapper around BaseWindow that provides event handling and resource management
 */
export class BaseWindowWrapper {
  private readonly childViews: WebContentsViewWrapper[] = []
  readonly events: Stream.Stream<WindowEvent>

  constructor(
    public readonly window: BaseWindow,
    private readonly eventQueue: Queue.Queue<WindowEvent>
  ) {
    this.events = Stream.fromQueue(this.eventQueue)
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    const offerEvent = (event: WindowEvent) => {
      Effect.logDebug(`Window event: ${event._tag}`)
      Effect.runSync(Queue.offer(this.eventQueue, event))
    }

    this.window.on('close', (event) => offerEvent({ _tag: 'close', event }))
    this.window.on('closed', () => offerEvent({ _tag: 'closed' }))
    this.window.on('blur', (event) => offerEvent({ _tag: 'blur', event }))
    this.window.on('focus', (event) => offerEvent({ _tag: 'focus', event }))
    this.window.on('show', () => offerEvent({ _tag: 'show' }))
    this.window.on('hide', () => offerEvent({ _tag: 'hide' }))
    this.window.on('maximize', () => offerEvent({ _tag: 'maximize' }))
    this.window.on('unmaximize', () => offerEvent({ _tag: 'unmaximize' }))
    this.window.on('minimize', () => offerEvent({ _tag: 'minimize' }))
    this.window.on('restore', () => offerEvent({ _tag: 'restore' }))
    this.window.on('resize', () => {
      const bounds = this.window.getBounds()
      offerEvent({
        _tag: 'resize',
        bounds: { width: bounds.width, height: bounds.height }
      })
    })
    this.window.on('resized', () => offerEvent({ _tag: 'resized' }))
    this.window.on('will-resize', (event, newBounds, details) =>
      offerEvent({ _tag: 'will-resize', event, newBounds, details })
    )
    this.window.on('move', () => {
      const position = this.window.getPosition()
      offerEvent({
        _tag: 'move',
        position: { x: position[0] ?? 0, y: position[1] ?? 0 }
      })
    })
    this.window.on('moved', () => offerEvent({ _tag: 'moved' }))
    this.window.on('will-move', (event, newBounds) =>
      offerEvent({ _tag: 'will-move', event, newBounds })
    )
    this.window.on('enter-full-screen', () => offerEvent({ _tag: 'enter-full-screen' }))
    this.window.on('leave-full-screen', () => offerEvent({ _tag: 'leave-full-screen' }))
    this.window.on('always-on-top-changed', (event, isAlwaysOnTop) =>
      offerEvent({ _tag: 'always-on-top-changed', event, isAlwaysOnTop })
    )
    this.window.on('app-command', (event, command) =>
      offerEvent({ _tag: 'app-command', event, command })
    )
    this.window.on('swipe', (event, direction) => offerEvent({ _tag: 'swipe', event, direction }))
    this.window.on('rotate-gesture', (event, rotation) =>
      offerEvent({ _tag: 'rotate-gesture', event, rotation })
    )
    this.window.on('sheet-begin', () => offerEvent({ _tag: 'sheet-begin' }))
    this.window.on('sheet-end', () => offerEvent({ _tag: 'sheet-end' }))
    this.window.on('new-window-for-tab', () => offerEvent({ _tag: 'new-window-for-tab' }))
    this.window.on('system-context-menu', (event, point) =>
      offerEvent({ _tag: 'system-context-menu', event, point })
    )
  }

  /**
   * Add a WebContentsViewWrapper to the window
   */
  addView(viewWrapper: WebContentsViewWrapper, zIndex?: number): void {
    this.window.contentView.addChildView(viewWrapper.view, zIndex)
    this.childViews.push(viewWrapper)
  }

  /**
   * Get all child views
   */
  getViews(): WebContentsViewWrapper[] {
    return [...this.childViews]
  }

  /**
   * Set the bounds of a view
   */
  setViewBounds(
    viewWrapper: WebContentsViewWrapper,
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    viewWrapper.setBounds(bounds)
  }

  // Window Management Methods
  focus = () => Effect.sync(() => this.window.focus())
  getBounds = () => Effect.sync(() => this.window.getBounds())
  setBounds = (bounds: WindowBounds) => Effect.sync(() => this.window.setBounds(bounds as any))
  show = () => Effect.sync(() => this.window.show())
  hide = () => Effect.sync(() => this.window.hide())
  maximize = () => Effect.sync(() => this.window.maximize())
  unmaximize = () => Effect.sync(() => this.window.unmaximize())
  isMaximized = () => Effect.sync(() => this.window.isMaximized())
  minimize = () => Effect.sync(() => this.window.minimize())
  restore = () => Effect.sync(() => this.window.restore())
  isMinimized = () => Effect.sync(() => this.window.isMinimized())
  setFullScreen = (flag: boolean) => Effect.sync(() => this.window.setFullScreen(flag))
  isFullScreen = () => Effect.sync(() => this.window.isFullScreen())
  setAlwaysOnTop = (flag: boolean) => Effect.sync(() => this.window.setAlwaysOnTop(flag))
  isAlwaysOnTop = () => Effect.sync(() => this.window.isAlwaysOnTop())
  setTitle = (title: string) => Effect.sync(() => this.window.setTitle(title))
  getTitle = () => Effect.sync(() => this.window.getTitle())
  isClosable = () => Effect.sync(() => this.window.isClosable())
  setClosable = (closable: boolean) => Effect.sync(() => this.window.setClosable(closable))
  setPosition = (x: number, y: number) => Effect.sync(() => this.window.setPosition(x, y))
  getPosition = () => Effect.sync(() => this.window.getPosition())
  center = () => Effect.sync(() => this.window.center())
  setResizable = (resizable: boolean) => Effect.sync(() => this.window.setResizable(resizable))
  isResizable = () => Effect.sync(() => this.window.isResizable())
  setMovable = (movable: boolean) => Effect.sync(() => this.window.setMovable(movable))
  isMovable = () => Effect.sync(() => this.window.isMovable())
  setMinimizable = (minimizable: boolean) =>
    Effect.sync(() => this.window.setMinimizable(minimizable))
  isMinimizable = () => Effect.sync(() => this.window.isMinimizable())
  setMaximizable = (maximizable: boolean) =>
    Effect.sync(() => this.window.setMaximizable(maximizable))
  isMaximizable = () => Effect.sync(() => this.window.isMaximizable())
  setFullScreenable = (fullscreenable: boolean) =>
    Effect.sync(() => this.window.setFullScreenable(fullscreenable))
  isFullScreenable = () => Effect.sync(() => this.window.fullScreenable)
  setOpacity = (opacity: number) => Effect.sync(() => this.window.setOpacity(opacity))
  getOpacity = () => Effect.sync(() => this.window.getOpacity())
  setWindowButtonVisibility = (visible: boolean) =>
    Effect.sync(() => this.window.setWindowButtonVisibility(visible))

  /**
   * Clean up resources associated with this window
   * Note: WebContentsViewWrappers will be cleaned up separately
   * by their own scope
   */
  cleanup(): void {
    // Remove all event listeners
    this.window.removeAllListeners()

    // Clear the array of child views (but don't clean them up here)
    this.childViews.length = 0

    // Destroy the window if it's not already destroyed
    if (!this.window.isDestroyed()) {
      this.window.close()
      this.window.destroy()
    }
  }
}

export type BaseWindowWrapperSchema = Schema.Schema.Type<typeof BaseWindowWrapper>
