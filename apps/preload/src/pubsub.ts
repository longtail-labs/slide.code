import { contextBridge, ipcRenderer } from 'electron'
import type { Message } from '@slide.code/schema/messages'
import { serializeMessage, deserializeMessage } from '@slide.code/schema/messages'
import { PUBSUB_CHANNELS } from '@slide.code/types'

/**
 * Expose the pubsub API to the renderer process
 */
export const exposePubsubBridge = (): void => {
  contextBridge.exposeInMainWorld('pubsub', {
    /**
     * Publish a message to the main process
     * Messages are serialized using Effect Schema for proper IPC transmission
     */
    publish: (message: Message) => {
      // Serialize the message before sending over IPC
      const serializedMessage = serializeMessage(message)
      ipcRenderer.send(PUBSUB_CHANNELS.PUBLISH, serializedMessage)
    },

    /**
     * Subscribe to messages from the main process
     * Used to receive published events from PubSub
     */
    subscribe: (callback: (message: Message) => void) => {
      // Create a handler that receives IPC messages and deserializes them
      const handler = (_event: Electron.IpcRendererEvent, serializedMessage: string) => {
        try {
          // Deserialize the message from IPC
          const message = deserializeMessage(serializedMessage)
          callback(message)
        } catch (error) {
          console.error('Error deserializing pubsub message:', error)
        }
      }

      // Add the event listener
      ipcRenderer.on(PUBSUB_CHANNELS.RENDERER_SUBSCRIBE, handler)

      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(PUBSUB_CHANNELS.RENDERER_SUBSCRIBE, handler)
      }
    }
  })

  console.log('[PRELOAD-PUBSUB] Pubsub bridge exposed to renderer')
}
