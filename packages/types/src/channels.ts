export interface WebviewClickPayload {
  x: number
  y: number
}

export const PUBSUB_CHANNELS = {
  RENDERER_SUBSCRIBE: 'PUBSUB_RENDERER_SUBSCRIBE',
  PUBLISH: 'PUBSUB_PUBLISH'
}

export const REF_CHANNELS = {
  REGISTER_REF: 'ipcref:register',
  UNREGISTER_REF: 'ipcref:unregister',
  UPDATE_REF: 'ipcref:update',
  GET_REF: 'ipcref:get',
  SYNC_REF: 'ipcref:sync'
} as const

export const IPC_CHANNELS = {
  WEBVIEW_CLICK: 'webview-click',
  WEBVIEW_NEW_TAB: 'webview-new-tab',
  GLOBAL_HOTKEY_CLOSE_WINDOW: 'global-hotkey-close-window'
} as const

export const RPC_CHANNELS = {
  CONNECT: 'rpc:connect',
  PORT: 'rpc:port',
  INTERRUPT: 'rpc:interrupt'
} as const

export interface IpcChannels {
  onWebviewClick: (callback: (coords: WebviewClickPayload) => void) => void
}

/**
 * Interface for the RPC bridge exposed to the renderer
 */
export interface ElectronRpcBridge {
  connect: () => Promise<void>
  send: (message: unknown) => void
  onMessage: (callback: (message: unknown) => void) => () => void
  interrupt: (requestId: string) => void
}

/**
 * Interface for the IPCRef API exposed to renderer
 */
export interface IPCRefPreloadApi {
  register: (refId: string) => void
  unregister: (refId: string) => void
  update: <T>(refId: string, value: T) => void
  get: <T>(refId: string) => Promise<T | null>
  subscribe: <T>(refId: string, callback: (value: T) => void) => () => void
}
