import { Effect, Schema, SubscriptionRef, Stream, Fiber, Scope } from 'effect'
import { ipcMain, webContents } from 'electron'
import { REF_CHANNELS } from '@slide.code/types'
import { DefaultLoggerLayer } from '../logger.js'
import { SlideRuntime } from '../index.js'
import { ElectronStoreUtil } from '../utils/electron-store.util.js'

/**
 * Message types for IPC communication
 */
export interface IPCRefMessage<T = unknown> {
  refId: string
  value?: T
  operation?: 'get' | 'update' | 'subscribe' | 'unsubscribe'
}

/**
 * Persistence options for IPCRef
 */
export interface IPCRefPersistOptions {
  persist: boolean
  key?: string
}

/**
 * Interface for IPCRef
 */
export interface IPCRef<A> {
  readonly refId: string
  readonly ref: SubscriptionRef.SubscriptionRef<A>
  readonly schema: Schema.Schema<A, any>
  readonly persistOptions?: IPCRefPersistOptions
  get: () => Effect.Effect<A>
  set: (value: A) => Effect.Effect<void>
  update: (f: (a: A) => A) => Effect.Effect<void>
  updateEffect: <R, E>(f: (a: A) => Effect.Effect<A, E, R>) => Effect.Effect<void, E, R>
  registerWebContents: (webContentsId: number) => void
  unregisterWebContents: (webContentsId: number) => void
}

/**
 * Creates an IPCRef as an Effect
 */
export const makeIPCRef = <A>(
  refId: string,
  initialValue: A,
  schema: Schema.Schema<A, any>,
  persistOptions?: IPCRefPersistOptions
): Effect.Effect<IPCRef<A>, never, Scope.Scope> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[IPCRef] Creating IPCRef: ${refId}`)

    // Rehydrate from storage if persistence is enabled
    let startValue = initialValue
    if (persistOptions?.persist) {
      const storeKey = persistOptions.key || `ipcref-${refId}`
      const storedValue = ElectronStoreUtil.get(storeKey)

      console.log('[IPCRef] Rehydrating', refId, storedValue)

      if (storedValue) {
        try {
          yield* Effect.logInfo(`[IPCRef] Rehydrating ${refId} from storage`)
          startValue = Schema.decodeUnknownSync(schema)(storedValue)
        } catch (error) {
          yield* Effect.logWarning(
            `[IPCRef] Failed to rehydrate ${refId}, using initial value: ${error}`
          )
        }
      }
    }

    // Create the subscription ref
    const ref = yield* SubscriptionRef.make(startValue)

    // Track registered web contents
    const registeredWebContents = new Set<number>()

    // Serialize function to transmit values
    const serialize = (value: A): unknown => Schema.encodeSync(schema)(value)

    // Broadcast function to send to all registered renderer processes
    const broadcastToRenderers = (value: A) =>
      Effect.sync(() => {
        try {
          const serialized = serialize(value)

          webContents.getAllWebContents().forEach((contents) => {
            if (registeredWebContents.has(contents.id) && !contents.isDestroyed()) {
              contents.send(`${REF_CHANNELS.SYNC_REF}:${refId}`, serialized)
            }
          })
        } catch (error) {
          console.error(`Error broadcasting IPCRef ${refId} update:`, error)
        }
      })

    // Persist changes if persistence is enabled
    const persistChanges = (value: A) =>
      Effect.sync(() => {
        if (persistOptions?.persist) {
          try {
            const storeKey = persistOptions.key || `ipcref-${refId}`
            const serialized = serialize(value)
            ElectronStoreUtil.set(storeKey, serialized)
          } catch (error) {
            console.error(`Error persisting IPCRef ${refId}:`, error)
          }
        }
      })

    // Set up change tracking to broadcast changes and persist
    const fiber = yield* Stream.runForEach(ref.changes, (value) =>
      Effect.all([broadcastToRenderers(value), persistChanges(value)])
    ).pipe(Effect.forkScoped)

    // Add finalizer to clean up when the ref is no longer needed
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo(`[IPCRef] Cleaning up IPCRef: ${refId}`)
        yield* Fiber.interrupt(fiber)
      })
    )

    // Create and return the IPCRef interface
    return {
      refId,
      ref,
      schema,
      persistOptions,
      get: () => SubscriptionRef.get(ref),
      set: (value: A) => SubscriptionRef.set(ref, value),
      update: (f: (a: A) => A) => SubscriptionRef.update(ref, f),
      updateEffect: <R, E>(f: (a: A) => Effect.Effect<A, E, R>) =>
        SubscriptionRef.updateEffect(ref, f),
      registerWebContents: (webContentsId: number) => {
        registeredWebContents.add(webContentsId)
      },
      unregisterWebContents: (webContentsId: number) => {
        registeredWebContents.delete(webContentsId)
      }
    }
  })

/**
 * IPCRefService errors
 */
export class IPCRefServiceError extends Error {
  readonly _tag = 'IPCRefServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'IPCRefServiceError'
  }
}

/**
 * IPCRefService for managing IPC references between main and renderer processes
 */
export class IPCRefService extends Effect.Service<IPCRefService>()('IPCRefService', {
  dependencies: [DefaultLoggerLayer],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[IPCRefService] 🔄 IPCRefService started')

    // Service state
    const refs = new Map<string, IPCRef<any>>()
    const schemas = new Map<string, Schema.Schema<any, any>>()

    // Setup IPC handlers
    setupIpcHandlers()

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[IPCRefService] 🧹 Cleaning up IPCRefService resources')

        // Remove IPC handlers
        ipcMain.removeAllListeners(REF_CHANNELS.REGISTER_REF)
        ipcMain.removeAllListeners(REF_CHANNELS.UNREGISTER_REF)
        ipcMain.removeAllListeners(REF_CHANNELS.UPDATE_REF)
        ipcMain.removeHandler(REF_CHANNELS.GET_REF)

        yield* Effect.logInfo('[IPCRefService] 🧹 IPCRefService cleaned up successfully')
      })
    )

    /**
     * Setup IPC handlers for renderer communication
     */
    function setupIpcHandlers() {
      // Handle registration of renderer processes
      ipcMain.on(REF_CHANNELS.REGISTER_REF, (event, message: IPCRefMessage) => {
        const ref = refs.get(message.refId)
        if (ref) {
          // Register this WebContents
          ref.registerWebContents(event.sender.id)

          // Send current value
          SlideRuntime.runPromise(ref.get()).then((value) => {
            if (!event.sender.isDestroyed()) {
              const serialized = Schema.encodeSync(ref.schema)(value)
              event.sender.send(`${REF_CHANNELS.SYNC_REF}:${message.refId}`, serialized)
            }
          })
        } else {
          console.warn(`IPCRef not found: ${message.refId}`)
        }
      })

      // Handle unregistration
      ipcMain.on(REF_CHANNELS.UNREGISTER_REF, (event, message: IPCRefMessage) => {
        const ref = refs.get(message.refId)
        if (ref) {
          ref.unregisterWebContents(event.sender.id)
        }
      })

      // Handle value updates from renderer
      ipcMain.on(REF_CHANNELS.UPDATE_REF, (_, message: IPCRefMessage) => {
        if (!message.refId || message.value === undefined) return

        const ref = refs.get(message.refId)
        if (ref) {
          try {
            const value = Schema.decodeUnknownSync(ref.schema)(message.value)
            SlideRuntime.runPromise(ref.set(value))
          } catch (error) {
            console.error(`Error updating IPCRef ${message.refId}:`, error)
          }
        }
      })

      // Handle value requests
      ipcMain.handle(REF_CHANNELS.GET_REF, async (_, message: IPCRefMessage) => {
        const ref = refs.get(message.refId)
        if (!ref) return null

        try {
          const value = await SlideRuntime.runPromise(ref.get())
          return Schema.encodeSync(ref.schema)(value)
        } catch (error) {
          console.error(`Error getting IPCRef ${message.refId}:`, error)
          return null
        }
      })
    }

    // Return the service API
    return {
      create: <A>(
        refId: string,
        initialValue: A,
        schema: Schema.Schema<A, any>,
        persistOptions?: IPCRefPersistOptions
      ) =>
        Effect.gen(function* () {
          if (refs.has(refId)) {
            yield* Effect.logWarning(
              `IPCRef with ID '${refId}' already exists, returning existing instance`
            )
            return refs.get(refId) as IPCRef<A>
          }

          const ref = yield* makeIPCRef(refId, initialValue, schema, persistOptions)
          refs.set(refId, ref)
          schemas.set(refId, schema)
          return ref
        }),

      get: <A>(refId: string): IPCRef<A> | undefined => {
        return refs.get(refId) as IPCRef<A> | undefined
      },

      remove: (refId: string): Effect.Effect<boolean> =>
        Effect.gen(function* () {
          const ref = refs.get(refId)
          if (ref) {
            refs.delete(refId)
            schemas.delete(refId)
            return true
          }
          return false
        })
    }
  })
}) {}
