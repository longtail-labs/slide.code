import { Effect, Layer, Mailbox } from 'effect'
import { ipcMain } from 'electron'
import type { IpcMainEvent, MessagePortMain } from 'electron'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import { Protocol } from '@effect/rpc/RpcServer'
import { RPC_CHANNELS } from '@slide.code/types'
import { SlideRuntime } from '../index.js'

/**
 * Creates a protocol layer for Electron IPC communication using MessagePorts
 */
export const makeElectronProtocol = Effect.gen(function* () {
  const serialization = yield* RpcSerialization.RpcSerialization
  const disconnects = yield* Mailbox.make<number>()

  // Map client IDs to their active ports
  const clientPorts = new Map<number, MessagePortMain>()

  // Track if cleanup has been performed
  let isCleanedUp = false

  // Store message and destroyed event handlers for cleanup
  const messageHandlers = new Map<number, (event: any) => void>()
  const destroyedHandlers = new Map<number, () => void>()

  // Function to be defined by the RPC server
  let writeRequest!: (clientId: number, message: any) => Effect.Effect<void>

  // Helper function to safely remove a client
  const safelyRemoveClient = (clientId: number) => {
    if (isCleanedUp) return

    const port = clientPorts.get(clientId)
    if (port) {
      try {
        // Remove event listeners
        if (messageHandlers.has(clientId)) {
          port.removeListener('message', messageHandlers.get(clientId)!)
          messageHandlers.delete(clientId)
        }

        port.close()
        clientPorts.delete(clientId)
        SlideRuntime.runSync(disconnects.offer(clientId))
      } catch (error) {
        console.error(`[ELECTRON-PROTOCOL] Error removing client ${clientId}:`, error)
      }
    }
  }

  // Add a finalizer to clean up when the runtime is disposed
  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      yield* Effect.logInfo('💥 Cleaning up RPC protocol')
      isCleanedUp = true

      // Remove all IPC listeners
      ipcMain.removeAllListeners(RPC_CHANNELS.PORT)
      ipcMain.removeAllListeners(RPC_CHANNELS.INTERRUPT)

      // Clean up any webContents destroyed listeners
      for (const [clientId, _] of destroyedHandlers.entries()) {
        try {
          // We can't directly remove by reference since we don't have the sender anymore
          // But we can let the handler become a no-op through the isCleanedUp flag
        } catch (error) {
          console.error(
            `[ELECTRON-PROTOCOL] Error removing destroyed handler for client ${clientId}:`,
            error
          )
        }
      }
      destroyedHandlers.clear()

      // Close all open ports and remove message handlers
      for (const [clientId, port] of clientPorts.entries()) {
        try {
          if (messageHandlers.has(clientId)) {
            port.removeListener('message', messageHandlers.get(clientId)!)
          }
          port.close()
        } catch (error) {
          console.error(`[ELECTRON-PROTOCOL] Error closing port for client ${clientId}:`, error)
        }
      }

      messageHandlers.clear()
      clientPorts.clear()
      yield* Effect.logInfo('✅ RPC protocol cleanup complete')
    })
  )

  ipcMain.on(RPC_CHANNELS.PORT, (event) => {
    if (isCleanedUp) {
      return
    }

    const clientId = event.sender.id

    if (!event.ports || event.ports.length === 0) {
      return
    }

    // Get the port from the renderer
    const port = event.ports[0]
    if (!port) {
      return
    }

    // Store the port for this client
    clientPorts.set(clientId, port)

    // Create message handler and store it for later cleanup
    const messageHandler = (messageEvent: any) => {
      if (isCleanedUp) return

      const message = messageEvent.data

      try {
        // Convert string ID to BigInt as required by Effect RPC
        if (message._tag === 'Request' && typeof message.id === 'string') {
          message.id = BigInt(message.id)
        }

        // Forward message to RPC handler
        Effect.runFork(writeRequest(clientId, message))
      } catch (error) {
        // Send error response directly
        if (message && message._tag === 'Request' && message.id) {
          const errorResponse = {
            _tag: 'Exit',
            requestId: typeof message.id === 'string' ? message.id : message.id.toString(),
            exit: {
              _tag: 'Failure',
              cause: {
                _tag: 'Die',
                defect: `Failed to process request: ${error}`
              }
            }
          }
          if (!isCleanedUp) {
            port.postMessage(errorResponse)
          }
        }
      }
    }

    // Store the handler for cleanup later
    messageHandlers.set(clientId, messageHandler)

    // Set up handler for messages from this client
    port.on('message', messageHandler)

    // Handle port closing
    port.on('close', () => {
      if (isCleanedUp) return
      safelyRemoveClient(clientId)
    })

    // Create destroyed handler and store it for later reference
    const destroyedHandler = () => {
      if (isCleanedUp) return
      safelyRemoveClient(clientId)
    }

    // Store the handler
    destroyedHandlers.set(clientId, destroyedHandler)

    // Set up cleanup when the window is destroyed
    event.sender.on('destroyed', destroyedHandler)

    // Start the port to receive messages
    port.start()
  })

  // Handle interrupt requests
  ipcMain.on(RPC_CHANNELS.INTERRUPT, (event: IpcMainEvent, message: any) => {
    if (isCleanedUp) return

    const clientId = event.sender.id

    if (message && message.requestId) {
      try {
        const requestId = BigInt(message.requestId)

        Effect.runFork(
          writeRequest(clientId, {
            _tag: 'Interrupt',
            requestId
          })
        )
      } catch (error) {
        console.error(`[ELECTRON-PROTOCOL] Error processing interrupt:`, error)
      }
    }
  })

  // Create the protocol service
  const protocol = yield* Protocol.make((writeRequest_) => {
    writeRequest = writeRequest_
    return Effect.succeed({
      disconnects,
      clientIds: Effect.sync(() => Array.from(clientPorts.keys())),
      send: (clientId, response, _) => {
        if (isCleanedUp) return Effect.void

        const port = clientPorts.get(clientId)
        if (!port) {
          return Effect.void
        }

        try {
          // Convert BigInts to strings for serialization if needed
          if (typeof response === 'object' && response && 'requestId' in response) {
            const resp = response as any
            if (typeof resp.requestId === 'bigint') {
              resp.requestId = resp.requestId.toString()
            }
          }

          // Force serialization to prevent cloning errors with complex objects.
          // This converts class instances and other non-plain objects into serializable data.
          // const serializedResponse = JSON.parse(JSON.stringify(response))

          // console.log('SENDING MESSAGE', response, serializedResponse)
          console.log('SENDING MESSAGE', response)

          // Send the response through the MessagePort
          port.postMessage(response)
          return Effect.void
        } catch (error) {
          return Effect.logError(`Failed to send response: ${error}`)
        }
      },
      end: (clientId) => {
        if (isCleanedUp) return Effect.void
        safelyRemoveClient(clientId)
        return Effect.void
      },
      initialMessage: Effect.succeedNone,
      supportsAck: true,
      supportsTransferables: false,
      supportsSpanPropagation: true
    })
  })

  return protocol
})

/**
 * Layer that provides the Electron IPC protocol
 */
export const ElectronProtocolLayer = Layer.scoped(Protocol, makeElectronProtocol)
