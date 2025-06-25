import { Effect, Layer, pipe } from 'effect'
import * as RpcClient from '@effect/rpc/RpcClient'
import * as RpcSerialization from '@effect/rpc/RpcSerialization'
import { SlideRpcs } from '@slide.code/schema/requests'
import type { ElectronRpcBridge } from '@slide.code/types'

// Global connection state
let isConnected = false
let connectionPromise: Promise<void> | null = null

// Get the bridge from the window
export const getBridge = (): ElectronRpcBridge => {
  console.log('[EFFECT-RPC] Getting bridge from window')
  if (typeof window === 'undefined' || !window.rpc) {
    console.error('[EFFECT-RPC] window.rpc is not available')
    throw new Error('Electron RPC bridge is not available')
  }
  return window.rpc as ElectronRpcBridge
}

// Ensure connection is established
export const ensureConnection = async (): Promise<void> => {
  if (isConnected) {
    return Promise.resolve()
  }

  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        console.log('[EFFECT-RPC] Establishing MessagePort connection')
        const bridge = getBridge()
        await bridge.connect()
        isConnected = true
        console.log('[EFFECT-RPC] Connected to RPC server via MessagePort')
      } catch (error) {
        console.error('[EFFECT-RPC] Connection error:', error)
        isConnected = false
        connectionPromise = null
        throw error
      }
    })()
  }

  return connectionPromise
}

/**
 * Create an ElectronRPC protocol for the Effect RPC client
 */
export const createElectronProtocol = RpcClient.Protocol.make((writeResponse) => {
  // The bridge should be available and connected before we use it
  const bridge = getBridge()

  // Setup handlers for messages from the main process
  const cleanup = bridge.onMessage((response: any) => {
    if (response) {
      console.log('[EFFECT-RPC] Received response:', response)

      // Convert string requestId to BigInt for Effect RPC
      if (response.requestId && typeof response.requestId === 'string') {
        try {
          response.requestId = BigInt(response.requestId)
        } catch (e) {
          console.error('[EFFECT-RPC] Failed to convert requestId to BigInt:', e)
        }
      }

      Effect.runSync(writeResponse(response))
    }
  })

  // Return the protocol implementation
  return Effect.succeed({
    send: (request: any) => {
      // First ensure we're connected
      return Effect.tryPromise({
        try: async () => {
          await ensureConnection()

          // Handle BigInt conversion for serialization
          let serializedRequest: any = { ...request }
          if (request._tag === 'Request' && typeof request.id === 'bigint') {
            serializedRequest.id = request.id.toString()
          } else if (
            (request._tag === 'Ack' || request._tag === 'Interrupt') &&
            typeof request.requestId === 'bigint'
          ) {
            serializedRequest.requestId = request.requestId.toString()
          }

          // Send through the bridge
          bridge.send(serializedRequest)
        },
        catch: (error) => error
      }).pipe(Effect.orElse(() => Effect.void))
    },
    supportsAck: true,
    supportsTransferables: false,
    cleanup
  })
})

/**
 * Layers required for the RPC client
 */
export const rpcLayers = Layer.merge(
  Layer.scoped(RpcClient.Protocol, createElectronProtocol),
  RpcSerialization.layerNdjson
)

/**
 * Creates a new Slide RPC client
 */
export const createSlideRpcClient = Effect.gen(function* (_) {
  return yield* RpcClient.make(SlideRpcs)
})

/**
 * For direct Effect-based access in React components with useEffect
 */
export const useRpcClient = () => {
  return {
    /**
     * Get a type-safe RPC client
     */
    getClient: createSlideRpcClient,

    /**
     * Get the layers needed for the RPC client
     */
    getLayers: () => rpcLayers,

    /**
     * Run an Effect program with the Slide RPC client
     * @param effectFn A function that takes a client and returns an Effect
     * @returns A Promise with the result
     */
    runRpcProgram: <T, E>(
      effectFn: (client: RpcClient.FromGroup<typeof SlideRpcs>) => Effect.Effect<T, E, never>
    ): Promise<T> => {
      console.log('[EFFECT-RPC] Running RPC program')

      // Ensure connection is established before running the program
      return ensureConnection().then(() => {
        return Effect.runPromise(
          pipe(
            createSlideRpcClient,
            Effect.flatMap(effectFn),
            Effect.provide(rpcLayers),
            Effect.scoped
          )
        )
      })
    }
  }
}
