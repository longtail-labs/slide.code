import { contextBridge, ipcRenderer } from 'electron'
import { REF_CHANNELS } from '@slide.code/types'

/**
 * Expose the IPCRef API to the renderer process through the contextBridge
 */
export const exposeIPCRefBridge = (): void => {
  contextBridge.exposeInMainWorld('ipcRef', {
    /**
     * Register a ref with the main process
     */
    register: (refId: string): void => {
      ipcRenderer.send(REF_CHANNELS.REGISTER_REF, { refId })
    },

    /**
     * Unregister a ref
     */
    unregister: (refId: string): void => {
      ipcRenderer.send(REF_CHANNELS.UNREGISTER_REF, { refId })
    },

    /**
     * Update a ref's value
     */
    update: <T>(refId: string, value: T): void => {
      ipcRenderer.send(REF_CHANNELS.UPDATE_REF, { refId, value })
    },

    /**
     * Get a ref's current value
     */
    get: async <T>(refId: string): Promise<T | null> => {
      return ipcRenderer.invoke(REF_CHANNELS.GET_REF, { refId })
    },

    /**
     * Subscribe to changes in a ref's value
     */
    subscribe: <T>(refId: string, callback: (value: T) => void): (() => void) => {
      // Create a handler that will be called when the value changes
      const handler = (_event: Electron.IpcRendererEvent, value: T) => {
        callback(value)
      }

      // Listen for updates on this ref's specific channel
      ipcRenderer.on(`${REF_CHANNELS.SYNC_REF}:${refId}`, handler)

      // Return a function to unsubscribe
      return () => {
        ipcRenderer.removeListener(`${REF_CHANNELS.SYNC_REF}:${refId}`, handler)
      }
    }
  })

  console.log('[IPCRef] Bridge exposed to renderer')
}
