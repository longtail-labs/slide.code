import { contextBridge, ipcRenderer } from 'electron'
import { RPC_CHANNELS } from '@slide.code/types'

/**
 * Expose the RPC API to the renderer process
 */
export const exposeRpcBridge = (): void => {
  // Store the current port for communication
  let activePort: MessagePort | null = null
  let isShuttingDown = false

  // Store cleanup functions to remove listeners during shutdown
  const cleanupFunctions: Array<() => void> = []

  // Add shutdown listener
  const beforeUnloadHandler = () => {
    console.log('[PRELOAD-RPC] Window unloading, cleaning up RPC bridge')
    isShuttingDown = true
    cleanupRpcConnection()
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)
  cleanupFunctions.push(() => window.removeEventListener('beforeunload', beforeUnloadHandler))

  // Function to clean up RPC connection
  const cleanupRpcConnection = () => {
    console.log('[PRELOAD-RPC] Cleaning up RPC connection')

    if (activePort) {
      try {
        // Close the port
        activePort.close()
        console.log('[PRELOAD-RPC] Port closed')
      } catch (error) {
        console.error('[PRELOAD-RPC] Error closing port:', error)
      }
      activePort = null
    }

    // Run all cleanup functions
    while (cleanupFunctions.length > 0) {
      try {
        const cleanup = cleanupFunctions.pop()
        if (cleanup) cleanup()
      } catch (error) {
        console.error('[PRELOAD-RPC] Error running cleanup function:', error)
      }
    }
  }

  contextBridge.exposeInMainWorld('rpc', {
    /**
     * Connect to the RPC server and get a MessagePort
     */
    connect: (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (isShuttingDown) {
          console.log('[PRELOAD-RPC] App is shutting down, not connecting')
          return reject(new Error('App is shutting down'))
        }

        console.log('[PRELOAD-RPC] Connecting to RPC server')

        try {
          // Clear any existing port
          if (activePort) {
            try {
              activePort.close()
            } catch (error) {
              console.error('[PRELOAD-RPC] Error closing existing port:', error)
            }
            activePort = null
          }

          // Create a MessageChannel in the renderer process
          const channel = new MessageChannel()
          activePort = channel.port1
          const mainPort = channel.port2

          console.log('[PRELOAD-RPC] Created MessageChannel')

          // Start the port
          activePort.start()

          // Set up error handler
          const errorHandler = (event: Event) => {
            console.error('[PRELOAD-RPC] Port error:', event)
          }
          activePort.addEventListener('error', errorHandler)

          // Add cleanup for error handler
          cleanupFunctions.push(() => {
            if (activePort) {
              activePort.removeEventListener('error', errorHandler)
            }
          })

          // Send the other end to the main process
          console.log('[PRELOAD-RPC] Sending port to main process')
          ipcRenderer.postMessage(RPC_CHANNELS.PORT, null, [mainPort])

          // Resolve immediately since we have our end of the port
          resolve()
        } catch (error) {
          console.error('[PRELOAD-RPC] Error connecting to RPC server:', error)
          reject(error)
        }
      })
    },

    /**
     * Send a message to the main process
     */
    send: (message: unknown): void => {
      if (isShuttingDown) {
        console.log('[PRELOAD-RPC] App is shutting down, not sending message')
        return
      }

      console.log('[PRELOAD-RPC] Sending message to main process:', message)
      try {
        if (!activePort) {
          console.error('[PRELOAD-RPC] No active port, cannot send message')
          throw new Error('No active RPC connection. Call connect() first.')
        }

        activePort.postMessage(message)
        console.log('[PRELOAD-RPC] Message sent successfully')
      } catch (error) {
        console.error('[PRELOAD-RPC] Error sending message:', error)
        throw error
      }
    },

    /**
     * Register callback for responses from the main process
     */
    onMessage: (callback: (message: unknown) => void): (() => void) => {
      if (isShuttingDown) {
        console.log('[PRELOAD-RPC] App is shutting down, not registering message handler')
        return () => {}
      }

      console.log('[PRELOAD-RPC] Registering onMessage callback')

      if (!activePort) {
        console.error('[PRELOAD-RPC] No active port, cannot register message handler')
        throw new Error('No active RPC connection. Call connect() first.')
      }

      // Handler for messages on the port
      const messageHandler = (event: MessageEvent) => {
        if (isShuttingDown) return

        console.log('[PRELOAD-RPC] Received response from main process:', event.data)
        try {
          callback(event.data)
          console.log('[PRELOAD-RPC] Response callback executed successfully')
        } catch (error) {
          console.error('[PRELOAD-RPC] Error in response callback:', error)
        }
      }

      // Register the handler
      activePort.addEventListener('message', messageHandler)
      console.log('[PRELOAD-RPC] Message handler registered')

      // Create cleanup function
      const cleanup = () => {
        console.log('[PRELOAD-RPC] Removing response listener')
        if (activePort) {
          activePort.removeEventListener('message', messageHandler)
        }
      }

      // Add to cleanup functions array
      cleanupFunctions.push(cleanup)

      // Return function to remove listener
      return cleanup
    },

    /**
     * Send an interrupt request to cancel a stream
     */
    interrupt: (requestId: string): void => {
      if (isShuttingDown) {
        console.log('[PRELOAD-RPC] App is shutting down, not sending interrupt')
        return
      }

      console.log(`[PRELOAD-RPC] Interrupting request: ${requestId}`)
      try {
        ipcRenderer.send(RPC_CHANNELS.INTERRUPT, { requestId })
        console.log(`[PRELOAD-RPC] Interrupt sent for request: ${requestId}`)
      } catch (error) {
        console.error(`[PRELOAD-RPC] Error sending interrupt:`, error)
      }
    },

    /**
     * Manually cleanup the RPC connection
     */
    cleanup: (): void => {
      console.log('[PRELOAD-RPC] Manual cleanup requested')
      isShuttingDown = true
      cleanupRpcConnection()
    }
  })

  // Log that the bridge is ready
  console.log('[PRELOAD-RPC] Electron RPC bridge exposed to renderer')
}
