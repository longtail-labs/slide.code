// src/types/webview.d.ts
export interface WebViewElement extends HTMLElement {
  src: string
  addEventListener<K extends keyof WebViewEvents>(
    type: K,
    listener: (event: WebViewEvents[K]) => void
  ): void
  removeEventListener<K extends keyof WebViewEvents>(
    type: K,
    listener: (event: WebViewEvents[K]) => void
  ): void
}

export interface WebViewEvents {
  'load-commit': LoadCommitEvent
  'did-finish-load': DidFinishLoadEvent
  'did-fail-load': FailLoadEvent
  'did-frame-finish-load': DidFrameFinishLoadEvent
  'did-start-loading': DidStartLoadingEvent
  'did-stop-loading': DidStopLoadingEvent
  'did-attach': DidAttachEvent
  'dom-ready': DomReadyEvent
  'page-title-updated': PageTitleEvent
  'page-favicon-updated': PageFaviconEvent
  'enter-html-full-screen': EnterHtmlFullScreenEvent
  'leave-html-full-screen': LeaveHtmlFullScreenEvent
  'console-message': ConsoleMessageEvent
  'found-in-page': FoundInPageEvent
  'will-navigate': WillNavigateEvent
  'will-frame-navigate': WillFrameNavigateEvent
  'did-start-navigation': DidStartNavigationEvent
  'did-redirect-navigation': DidRedirectNavigationEvent
  'did-navigate': DidNavigateEvent
  'did-frame-navigate': FrameNavigationEvent
  'did-navigate-in-page': DidNavigateInPageEvent
  close: CloseEvent
  'ipc-message': IpcMessageEvent
  'render-process-gone': RenderProcessGoneEvent
  'plugin-crashed': PluginCrashedEvent
  destroyed: DestroyedEvent
  'media-started-playing': MediaStartedPlayingEvent
  'media-paused': MediaPausedEvent
  'did-change-theme-color': DidChangeThemeColorEvent
  'update-target-url': UpdateTargetUrlEvent
  'devtools-open-url': DevToolsOpenUrlEvent
  'devtools-search-query': DevToolsSearchQueryEvent
  'devtools-opened': DevToolsOpenedEvent
  'devtools-closed': DevToolsClosedEvent
  'devtools-focused': DevToolsFocusedEvent
  'context-menu': WebViewContextMenuEvent
  'close-tab': CloseTabEvent
  // Add more events as needed
}

// Your provided interfaces
export interface LoadCommitEvent {
  url: string
  isMainFrame: boolean
}

export interface FailLoadEvent {
  errorCode: number
  errorDescription: string
  validatedURL: string
  isMainFrame: boolean
}

export interface NavigationEvent {
  url: string
  isMainFrame: boolean
}

export interface FrameNavigationEvent extends NavigationEvent {
  httpResponseCode: number
  httpStatusText: string
  frameProcessId: number
  frameRoutingId: number
}

export interface PageTitleEvent {
  title: string
  explicitSet: boolean
}

export interface PageFaviconEvent {
  favicons: string[]
}

export interface ConsoleMessageEvent {
  level: 0 | 1 | 2 | 3 // 0: verbose, 1: info, 2: warning, 3: error
  message: string
  line: number
  sourceId: string
}

export interface FoundInPageEvent {
  result: {
    requestId: number
    activeMatchOrdinal: number
    matches: number
    selectionArea: DOMRect
    finalUpdate: boolean
  }
}

export interface WebViewContextMenuEvent {
  preventDefault: () => void
  params: {
    x: number
    y: number
    linkURL: string
    linkText: string
    pageURL: string
    frameURL: string
    srcURL: string
    mediaType: 'none' | 'image' | 'audio' | 'video' | 'canvas' | 'file' | 'plugin'
    hasImageContents: boolean
    isEditable: boolean
    selectionText: string
    titleText: string
    altText: string
    suggestedFilename: string
    selectionRect: DOMRect
    selectionStartOffset: number
    referrerPolicy: string
    misspelledWord: string
    dictionarySuggestions: string[]
    frameCharset: string
    formControlType: string
    spellcheckEnabled: boolean
  }
}

export interface RenderProcessGoneEvent {
  details: {
    reason: string // e.g., 'crashed', 'killed'
    exitCode: number
  }
}

export interface DidFrameFinishLoadEvent extends Event {
  isMainFrame: boolean
}

export type DidStartLoadingEvent = Event
export type DidStopLoadingEvent = Event
export type DidAttachEvent = Event
export type DomReadyEvent = Event
export type EnterHtmlFullScreenEvent = Event
export type LeaveHtmlFullScreenEvent = Event
export interface DidNavigateEvent {
  url: string
}
export interface DidNavigateInPageEvent {
  isMainFrame: boolean
  url: string
}
export type CloseEvent = Event
export interface IpcMessageEvent {
  frameId: [number, number]
  channel: string
  args: any[]
}
export interface PluginCrashedEvent {
  name: string
  version: string
}
export type DestroyedEvent = Event
export type MediaStartedPlayingEvent = Event
export type MediaPausedEvent = Event
export interface DidChangeThemeColorEvent {
  themeColor: string
}
export interface UpdateTargetUrlEvent {
  url: string
}
export interface DevToolsOpenUrlEvent {
  url: string
}
export interface DevToolsSearchQueryEvent {
  event: Event
  query: string
}
export type DevToolsOpenedEvent = Event
export type DevToolsClosedEvent = Event
export type DevToolsFocusedEvent = Event
export type DidFinishLoadEvent = Event
export interface WillNavigateEvent {
  url: string
}
export interface WillFrameNavigateEvent {
  url: string
  isMainFrame: boolean
  frameProcessId: number
  frameRoutingId: number
}
export interface DidStartNavigationEvent {
  url: string
  isInPlace: boolean
  isMainFrame: boolean
  frameProcessId: number
  frameRoutingId: number
}
export interface DidRedirectNavigationEvent {
  url: string
  isInPlace: boolean
  isMainFrame: boolean
  frameProcessId: number
  frameRoutingId: number
}
export interface CloseTabEvent extends Event {
  // No additional properties needed for this event
}
