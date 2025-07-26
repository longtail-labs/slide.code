import { Effect, Stream, Queue } from 'effect'
import { WebContentsView } from 'electron'
import { PubSubClient } from '../../services/pubsub.service.js'
import { SlideRuntime } from '../../index.js'

/**
 * Type representing different WebContentsView events
 */
export type WebContentsViewEvent =
  | { _tag: 'did-finish-load' }
  | {
      _tag: 'did-fail-load'
      errorCode: number
      errorDescription: string
      validatedURL: string
      isMainFrame: boolean
    }
  | { _tag: 'did-frame-finish-load'; isMainFrame: boolean }
  | { _tag: 'did-start-loading' }
  | { _tag: 'did-stop-loading' }
  | { _tag: 'dom-ready' }
  | { _tag: 'page-title-updated'; title: string; explicitSet: boolean }
  | { _tag: 'will-navigate'; url: string }
  | { _tag: 'did-navigate'; url: string }
  | { _tag: 'did-navigate-in-page'; url: string; isMainFrame: boolean }
  | { _tag: 'devtools-opened' }
  | { _tag: 'devtools-closed' }
  | { _tag: 'devtools-focused' }
  | { _tag: 'certificate-error'; url: string; error: string; certificate: Electron.Certificate }
  | { _tag: 'context-menu'; params: Electron.ContextMenuParams }
  | { _tag: 'found-in-page'; result: Electron.Result }
  | { _tag: 'media-started-playing' }
  | { _tag: 'media-paused' }
  | { _tag: 'did-change-theme-color'; color: string | null }
  | { _tag: 'cursor-changed'; type: string }
  | { _tag: 'console-message'; level: string; message: string; line: number; sourceId: string }
  | { _tag: 'page-favicon-updated'; favicons: string[] }
  | { _tag: 'window-open'; url: string; frameName: string; disposition: string }
  | { _tag: 'will-download'; item: Electron.DownloadItem; url: string }
  | { _tag: 'download-completed'; item: Electron.DownloadItem; url: string; savePath: string }
  | { _tag: 'download-cancelled'; item: Electron.DownloadItem; url: string }
  | { _tag: 'download-failed'; item: Electron.DownloadItem; url: string; error: string }

/**
 * Callback type for handling content updates
 */
export type ContentUpdateCallback = (updates: {
  url?: string
  title?: string
  favicon?: string
}) => Effect.Effect<void, unknown, never>

/**
 * Callback type for handling window open requests (e.g., cmd+click on links)
 */
export type WindowOpenCallback = (details: {
  url: string
  frameName: string
  disposition: string
}) => any

/**
 * Errors that can be thrown by the WebContentsView resource
 */
export class WebContentsViewError extends Error {
  readonly _tag = 'WebContentsViewError'

  constructor(message: string) {
    super(message)
    this.name = 'WebContentsViewError'
  }
}

/**
 * A wrapper around WebContentsView that provides event handling and resource management
 */
export class WebContentsViewWrapper {
  readonly events: Stream.Stream<WebContentsViewEvent>
  private pubSubClient: PubSubClient | null = null
  private frameSubscribed: boolean = false
  private contentUpdateCallback: ContentUpdateCallback | null = null
  private windowOpenCallback: WindowOpenCallback | null = null
  private currentUrl: string = ''
  private cleanedUp: boolean = false

  constructor(
    public readonly view: WebContentsView,
    private readonly eventQueue: Queue.Queue<WebContentsViewEvent>
  ) {
    this.events = Stream.fromQueue(this.eventQueue)
    this.setupEventHandlers()
  }

  /**
   * Set a callback to be called when content updates (URL, title, favicon) occur
   */
  setContentUpdateCallback(callback: ContentUpdateCallback): void {
    this.contentUpdateCallback = callback
  }

  /**
   * Set a callback to be called when a window open is requested (cmd+click on links)
   */
  setWindowOpenCallback(callback: WindowOpenCallback): void {
    this.windowOpenCallback = callback
  }

  /**
   * Setup WebContents event handlers
   */
  private setupEventHandlers(): void {
    const webContents = this.view.webContents
    const offerEvent = (event: WebContentsViewEvent) => {
      // Effect.logDebug(`WebContentsView event: ${event._tag}`)
      SlideRuntime.runFork(Queue.offer(this.eventQueue, event))
    }

    webContents.on('did-finish-load', () => {
      offerEvent({ _tag: 'did-finish-load' })
    })

    webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL, isMainFrame) => {
      offerEvent({
        _tag: 'did-fail-load',
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame
      })
    })

    webContents.on('did-frame-finish-load', (_, isMainFrame) => {
      offerEvent({
        _tag: 'did-frame-finish-load',
        isMainFrame
      })
    })

    webContents.on('did-start-loading', () => {
      offerEvent({ _tag: 'did-start-loading' })
    })

    webContents.on('did-stop-loading', () => {
      offerEvent({ _tag: 'did-stop-loading' })
    })

    webContents.on('dom-ready', () => {
      offerEvent({ _tag: 'dom-ready' })
    })

    webContents.on('page-title-updated', (_, title: string, explicitSet: boolean) => {
      offerEvent({
        _tag: 'page-title-updated',
        title,
        explicitSet
      })

      // Call the update callback if provided
      // if (this.contentUpdateCallback) {
      //   SlideRuntime.runFork(this.contentUpdateCallback({ title }))
      // }
    })

    // Add navigation event handlers
    webContents.on('will-navigate', (_, url: string) => {
      offerEvent({
        _tag: 'will-navigate',
        url
      })
    })

    webContents.on('did-navigate', (_, url: string) => {
      offerEvent({
        _tag: 'did-navigate',
        url
      })

      // Save current URL and call update callback if provided
      this.currentUrl = url
      // if (this.contentUpdateCallback) {
      //   SlideRuntime.runFork(this.contentUpdateCallback({ url }))
      // }
    })

    webContents.on('did-navigate-in-page', (_, url: string, isMainFrame: boolean) => {
      offerEvent({
        _tag: 'did-navigate-in-page',
        url,
        isMainFrame
      })

      // Only update for main frame navigations
      // if (isMainFrame && this.contentUpdateCallback && url !== this.currentUrl) {
      //   this.currentUrl = url
      //   SlideRuntime.runFork(this.contentUpdateCallback({ url }))
      // }
    })

    webContents.on('devtools-opened', () => {
      offerEvent({ _tag: 'devtools-opened' })
    })

    webContents.on('devtools-closed', () => {
      offerEvent({ _tag: 'devtools-closed' })
    })

    webContents.on('devtools-focused', () => {
      offerEvent({ _tag: 'devtools-focused' })
    })

    webContents.on('certificate-error', (_, url, error, certificate) => {
      offerEvent({
        _tag: 'certificate-error',
        url,
        error,
        certificate
      })
    })

    webContents.on('context-menu', (_, params) => {
      offerEvent({
        _tag: 'context-menu',
        params
      })
    })

    webContents.on('found-in-page', (_, result) => {
      offerEvent({
        _tag: 'found-in-page',
        result
      })
    })

    webContents.on('media-started-playing', () => {
      offerEvent({ _tag: 'media-started-playing' })
    })

    webContents.on('media-paused', () => {
      offerEvent({ _tag: 'media-paused' })
    })

    webContents.on('did-change-theme-color', (_, color) => {
      offerEvent({
        _tag: 'did-change-theme-color',
        color
      })
    })

    webContents.on('cursor-changed', (_, type) => {
      offerEvent({
        _tag: 'cursor-changed',
        type
      })
    })

    webContents.on('console-message', (_, level, message, line, sourceId) => {
      offerEvent({
        _tag: 'console-message',
        level: level === 0 ? 'verbose' : level === 1 ? 'info' : level === 2 ? 'warning' : 'error',
        message,
        line,
        sourceId
      })
    })

    // Add page-favicon-updated handler
    webContents.on('page-favicon-updated', (_, favicons) => {
      offerEvent({
        _tag: 'page-favicon-updated',
        favicons
      })

      // Call the update callback if provided and favicons exist
      // if (this.contentUpdateCallback && favicons.length > 0) {
      //   SlideRuntime.runFork(this.contentUpdateCallback({ favicon: favicons[0] }))
      // }
    })

    // Add window open handler to handle cmd+click on links
    webContents.setWindowOpenHandler((details) => {
      console.log('[WebContentsViewWrapper] Window open handler:', details)
      // Emit event to stream
      offerEvent({
        _tag: 'window-open',
        url: details.url,
        frameName: details.frameName,
        disposition: details.disposition
      })

      // Call the callback if provided
      if (this.windowOpenCallback) {
        SlideRuntime.runFork(
          this.windowOpenCallback({
            url: details.url,
            frameName: details.frameName,
            disposition: details.disposition
          })
        )
      }

      // Prevent default window creation - we'll handle it ourselves
      return { action: 'deny' }
    })

    // Add download handler - must be on webContents.session per Electron docs
    webContents.session.on('will-download', (event, item, webContents) => {
      console.log('[WebContentsViewWrapper] Download starting:', {
        url: item.getURL(),
        filename: item.getFilename(),
        mimeType: item.getMimeType(),
        totalBytes: item.getTotalBytes()
      })

      // Emit will-download event
      offerEvent({
        _tag: 'will-download',
        item,
        url: item.getURL()
      })

      // Set up download event handlers
      item.on('updated', (event, state) => {
        if (state === 'interrupted') {
          console.log('[WebContentsViewWrapper] Download interrupted')
        } else if (state === 'progressing') {
          if (item.isPaused()) {
            console.log('[WebContentsViewWrapper] Download paused')
          } else {
            const progress = Math.round((item.getReceivedBytes() / item.getTotalBytes()) * 100)
            console.log(`[WebContentsViewWrapper] Download progress: ${progress}%`)
          }
        }
      })

      item.once('done', (event, state) => {
        if (state === 'completed') {
          console.log('[WebContentsViewWrapper] Download completed:', item.getSavePath())
          offerEvent({
            _tag: 'download-completed',
            item,
            url: item.getURL(),
            savePath: item.getSavePath()
          })
        } else if (state === 'cancelled') {
          console.log('[WebContentsViewWrapper] Download cancelled')
          offerEvent({
            _tag: 'download-cancelled',
            item,
            url: item.getURL()
          })
        } else if (state === 'interrupted') {
          console.log('[WebContentsViewWrapper] Download failed')
          offerEvent({
            _tag: 'download-failed',
            item,
            url: item.getURL(),
            error: 'Download interrupted'
          })
        }
      })
    })
  }

  // WebContents Methods
  loadURL = (url: string, options?: Electron.LoadURLOptions) =>
    Effect.tryPromise({
      try: () => this.view.webContents.loadURL(url, options),
      catch: (error) => new WebContentsViewError(`Failed to load URL: ${error}`)
    })

  // Non-blocking version of loadURL that doesn't wait for the page to load
  startLoadingURL = (url: string, options?: Electron.LoadURLOptions) =>
    Effect.sync(() => {
      // Start loading but don't wait for promise to resolve
      this.view.webContents
        .loadURL(url, options)
        .catch((error) => console.error(`Failed to load URL: ${error}`))
    })

  loadFile = (filePath: string, options?: Electron.LoadFileOptions) =>
    Effect.tryPromise({
      try: () => this.view.webContents.loadFile(filePath, options),
      catch: (error) => new WebContentsViewError(`Failed to load file: ${error}`)
    })

  // Non-blocking version of loadFile that doesn't wait for the page to load
  startLoadingFile = (filePath: string, options?: Electron.LoadFileOptions) =>
    Effect.sync(() => {
      // Start loading but don't wait for promise to resolve
      this.view.webContents
        .loadFile(filePath, options)
        .catch((error) => console.error(`Failed to load file: ${error}`))
    })

  /**
   * Reload the current page
   * @returns An Effect that reloads the page
   */
  reload = () => Effect.sync(() => this.view.webContents.reload())

  /**
   * Force reload the current page (ignoring cache)
   * @returns An Effect that force reloads the page
   */
  reloadIgnoringCache = () => Effect.sync(() => this.view.webContents.reloadIgnoringCache())

  /**
   * Stop loading the current page
   * @returns An Effect that stops loading
   */
  stop = () => Effect.sync(() => this.view.webContents.stop())

  /**
   * Navigate back in history
   * @returns An Effect that navigates back and indicates if navigation was successful
   */
  goBack = () =>
    Effect.sync(() => {
      if (this.view.webContents.canGoBack()) {
        this.view.webContents.goBack()
        return true
      }
      return false
    })

  /**
   * Navigate forward in history
   * @returns An Effect that navigates forward and indicates if navigation was successful
   */
  goForward = () =>
    Effect.sync(() => {
      if (this.view.webContents.canGoForward()) {
        this.view.webContents.goForward()
        return true
      }
      return false
    })

  /**
   * Check if can navigate back in history
   * @returns An Effect that returns whether the webview can go back
   */
  canGoBack = () => Effect.sync(() => this.view.webContents.canGoBack())

  /**
   * Check if can navigate forward in history
   * @returns An Effect that returns whether the webview can go forward
   */
  canGoForward = () => Effect.sync(() => this.view.webContents.canGoForward())

  /**
   * Get the current URL
   * @returns An Effect that returns the current URL
   */
  getURL = () => Effect.sync(() => this.view.webContents.getURL())

  /**
   * Get the page title
   * @returns An Effect that returns the page title
   */
  getTitle = () => Effect.sync(() => this.view.webContents.getTitle())

  /**
   * Check if the page is currently loading
   * @returns An Effect that returns whether the page is loading
   */
  isLoading = () => Effect.sync(() => this.view.webContents.isLoading())

  /**
   * Check if the page has crashed
   * @returns An Effect that returns whether the page has crashed
   */
  isCrashed = () => Effect.sync(() => this.view.webContents.isCrashed())

  /**
   * Execute JavaScript in the page
   * @param code JavaScript code to execute
   * @param userGesture Whether to run the code with user gesture privileges
   * @returns An Effect that executes the JavaScript and returns any result
   */
  executeJavaScript = (code: string, userGesture = false) =>
    Effect.tryPromise({
      try: () => this.view.webContents.executeJavaScript(code, userGesture),
      catch: (error) => new WebContentsViewError(`Failed to execute JavaScript: ${error}`)
    })

  /**
   * Get the currently selected text from the page
   * @returns An Effect that returns the selected text or empty string if none
   */
  getSelectedText = () =>
    Effect.tryPromise({
      try: () => this.view.webContents.executeJavaScript('window.getSelection().toString()'),
      catch: (error) => new WebContentsViewError(`Failed to get selected text: ${error}`)
    }).pipe(Effect.map((result) => (typeof result === 'string' ? result.trim() : '')))

  /**
   * Get detailed selection information including text, range, and context
   * @returns An Effect that returns selection details
   */
  getSelectionDetails = () =>
    Effect.tryPromise({
      try: () =>
        this.view.webContents.executeJavaScript(`
          (() => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
              return { text: '', hasSelection: false };
            }
            
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString().trim();
            
            if (!selectedText) {
              return { text: '', hasSelection: false };
            }
            
            // Get surrounding context (50 chars before and after)
            const container = range.commonAncestorContainer;
            const fullText = container.textContent || '';
            const startOffset = range.startOffset;
            const endOffset = range.endOffset;
            
            const contextStart = Math.max(0, startOffset - 50);
            const contextEnd = Math.min(fullText.length, endOffset + 50);
            const context = fullText.substring(contextStart, contextEnd);
            
            // Get element information
            let element = range.startContainer;
            if (element.nodeType === Node.TEXT_NODE) {
              element = element.parentElement;
            }
            
            const elementInfo = {
              tagName: element?.tagName?.toLowerCase() || '',
              className: element?.className || '',
              id: element?.id || ''
            };
            
            return {
              text: selectedText,
              hasSelection: true,
              context,
              elementInfo,
              range: {
                startOffset,
                endOffset,
                collapsed: range.collapsed
              },
              url: window.location.href,
              title: document.title
            };
          })()
        `),
      catch: (error) => new WebContentsViewError(`Failed to get selection details: ${error}`)
    })

  /**
   * Clear the current text selection
   * @returns An Effect that clears the selection
   */
  clearSelection = () =>
    Effect.tryPromise({
      try: () => this.view.webContents.executeJavaScript('window.getSelection().removeAllRanges()'),
      catch: (error) => new WebContentsViewError(`Failed to clear selection: ${error}`)
    })

  /**
   * Select all text on the page
   * @returns An Effect that selects all text
   */
  selectAllText = () =>
    Effect.tryPromise({
      try: () => this.view.webContents.executeJavaScript('document.execCommand("selectAll")'),
      catch: (error) => new WebContentsViewError(`Failed to select all text: ${error}`)
    })

  /**
   * Get text content from a specific element by selector
   * @param selector CSS selector for the element
   * @returns An Effect that returns the element's text content
   */
  getElementText = (selector: string) =>
    Effect.tryPromise({
      try: () =>
        this.view.webContents.executeJavaScript(`
          (() => {
            const element = document.querySelector('${selector}');
            return element ? element.textContent || element.innerText || '' : '';
          })()
        `),
      catch: (error) => new WebContentsViewError(`Failed to get element text: ${error}`)
    })

  /**
   * Find text in the page
   * @param text The text to search for
   * @param options Search options
   * @returns An Effect that initiates the search
   */
  findInPage = (text: string, options?: Electron.FindInPageOptions) =>
    Effect.sync(() => {
      if (!text) return 0
      return this.view.webContents.findInPage(text, options)
    })

  /**
   * Stop finding text in the page
   * @param action Action to take when stopping the search
   * @returns An Effect that stops finding
   */
  stopFindInPage = (
    action: 'clearSelection' | 'keepSelection' | 'activateSelection' = 'clearSelection'
  ) => Effect.sync(() => this.view.webContents.stopFindInPage(action))

  /**
   * Set a WebContents instance to use as DevTools for this WebContents instance
   * @param devToolsWebContents - The WebContents to use as DevTools
   */
  setDevToolsWebContents = (devToolsWebContents: Electron.WebContents) =>
    Effect.sync(() => this.view.webContents.setDevToolsWebContents(devToolsWebContents))

  /**
   * Opens DevTools for this WebContents
   * @param options - Options for opening DevTools
   */
  openDevTools = (options?: Electron.OpenDevToolsOptions) =>
    Effect.sync(() => this.view.webContents.openDevTools(options))

  /**
   * Closes DevTools for this WebContents
   */
  closeDevTools = () => Effect.sync(() => this.view.webContents.closeDevTools())

  /**
   * Checks if DevTools is opened
   * @returns boolean indicating if DevTools is open
   */
  isDevToolsOpened = () => Effect.sync(() => this.view.webContents.isDevToolsOpened())

  /**
   * Checks if DevTools is focused
   * @returns boolean indicating if DevTools is focused
   */
  isDevToolsFocused = () => Effect.sync(() => this.view.webContents.isDevToolsFocused())

  /**
   * Toggles DevTools (opens if closed, closes if open)
   */
  toggleDevTools = () => Effect.sync(() => this.view.webContents.toggleDevTools())

  /**
   * Sets whether audio is muted
   * @param muted Whether audio should be muted
   * @returns An Effect that mutes or unmutes audio
   */
  setAudioMuted = (muted: boolean) => Effect.sync(() => this.view.webContents.setAudioMuted(muted))

  /**
   * Checks if audio is muted
   * @returns An Effect that returns whether audio is muted
   */
  isAudioMuted = () => Effect.sync(() => this.view.webContents.isAudioMuted())

  /**
   * Sets the zoom level
   * @param level The zoom level to set
   * @returns An Effect that sets the zoom level
   */
  setZoomLevel = (level: number) => Effect.sync(() => this.view.webContents.setZoomLevel(level))

  /**
   * Gets the current zoom level
   * @returns An Effect that returns the zoom level
   */
  getZoomLevel = () => Effect.sync(() => this.view.webContents.getZoomLevel())

  /**
   * Sets the zoom factor (1.0 is 100%)
   * @param factor The zoom factor to set
   * @returns An Effect that sets the zoom factor
   */
  setZoomFactor = (factor: number) => Effect.sync(() => this.view.webContents.setZoomFactor(factor))

  /**
   * Gets the current zoom factor
   * @returns An Effect that returns the zoom factor
   */
  getZoomFactor = () => Effect.sync(() => this.view.webContents.getZoomFactor())

  /**
   * Increase the zoom factor by the specified amount
   * @param amount The amount to increase the zoom factor by (default: 0.1)
   * @returns An Effect that increases the zoom factor
   */
  zoomIn = (amount: number = 0.1) =>
    Effect.sync(() => {
      const currentFactor = this.view.webContents.getZoomFactor()
      this.view.webContents.setZoomFactor(currentFactor + amount)
      return currentFactor + amount
    })

  /**
   * Decrease the zoom factor by the specified amount
   * @param amount The amount to decrease the zoom factor by (default: 0.1)
   * @returns An Effect that decreases the zoom factor
   */
  zoomOut = (amount: number = 0.1) =>
    Effect.sync(() => {
      const currentFactor = this.view.webContents.getZoomFactor()
      const newFactor = Math.max(0.1, currentFactor - amount)
      this.view.webContents.setZoomFactor(newFactor)
      return newFactor
    })

  /**
   * Reset the zoom factor to 1.0 (100%)
   * @returns An Effect that resets the zoom factor
   */
  resetZoom = () => Effect.sync(() => this.view.webContents.setZoomFactor(1.0))

  /**
   * Executes the paste command in the current web contents
   * @returns An Effect that performs the paste operation
   */
  paste = () => Effect.sync(() => this.view.webContents.paste())

  /**
   * Executes the paste and match style command in the current web contents
   * @returns An Effect that performs the paste and match style operation
   */
  pasteAndMatchStyle = () => Effect.sync(() => this.view.webContents.pasteAndMatchStyle())

  /**
   * Executes the cut command in the current web contents
   * @returns An Effect that performs the cut operation
   */
  cut = () => Effect.sync(() => this.view.webContents.cut())

  /**
   * Executes the selectAll command in the current web contents
   * @returns An Effect that performs the select all operation
   */
  selectAll = () => Effect.sync(() => this.view.webContents.selectAll())

  /**
   * Scroll to the top of the page
   * @returns An Effect that scrolls to the top
   */
  scrollToTop = () => this.executeJavaScript('window.scrollTo(0, 0)')

  /**
   * Scroll to the bottom of the page
   * @returns An Effect that scrolls to the bottom
   */
  scrollToBottom = () => this.executeJavaScript('window.scrollTo(0, document.body.scrollHeight)')

  /**
   * Toggle audio mute state
   * @returns An Effect that toggles the audio mute state and returns the new state
   */
  toggleAudioMute = () =>
    Effect.sync(() => {
      const isMuted = this.view.webContents.isAudioMuted()
      this.view.webContents.setAudioMuted(!isMuted)
      return !isMuted
    })

  /**
   * Focus the view
   */
  focus = () => Effect.sync(() => this.view.webContents.focus())

  /**
   * Check if the view is focused
   * @returns boolean indicating if the view is focused
   */
  isFocused = () => Effect.sync(() => this.view.webContents.isFocused())

  // WebContentsView Methods
  setBounds = (bounds: Electron.Rectangle) => Effect.sync(() => this.view.setBounds(bounds))

  getBounds = () => Effect.sync(() => this.view.getBounds())

  setVisible = (visible: boolean) => Effect.sync(() => this.view.setVisible(visible))

  // setVisible = (visible: boolean) =>
  //   Effect.gen(function* () {
  //     // Access the wrapper through the service argument
  //     const wrapper = $ as unknown as WebContentsViewWrapper

  //     // Call the native method
  //     wrapper.view.setVisible(visible)

  //     // Extra safety - if setting to visible, make sure it's not hidden by other means
  //     if (visible) {
  //       // Make sure webContents is also visible and focused
  //       wrapper.view.webContents.focus()
  //     }

  //     // Return the result of the operation
  //     return visible
  //   })

  getVisible = () =>
    Effect.sync(() => {
      // WebContentsView doesn't have isVisible method
      // Try to determine visibility through bounds checking
      const bounds = this.view.getBounds()
      return bounds.width > 0 && bounds.height > 0
    })

  /**
   * Clean up resources associated with this WebContentsView
   */
  cleanup(): void {
    if (this.cleanedUp) {
      Effect.logDebug('WebContentsView already cleaned up')
      return
    }

    // Check if the main view object and its webContents are valid before proceeding
    if (
      this.view &&
      this.view.webContents &&
      typeof this.view.webContents.isDestroyed === 'function'
    ) {
      const webContents = this.view.webContents
      if (!webContents.isDestroyed()) {
        webContents.removeAllListeners()
        webContents.close()
      } else {
        Effect.logDebug(
          'WebContentsView webContents already destroyed or null (when view and webContents existed)'
        )
      }
    } else {
      Effect.logDebug(
        'WebContentsView main view object, its webContents, or isDestroyed method is not accessible/valid.'
      )
    }

    this.cleanedUp = true
    Effect.logDebug('WebContentsView resources cleaned up')
  }
}
