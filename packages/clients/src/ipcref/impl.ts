import { Effect, Schema } from 'effect'

/**
 * Renderer-side implementation of IPCRef
 * This provides a client that can communicate with the main process SubscriptionRef
 */
export class IPCRef<A> {
  private currentValue: A | null = null
  private listeners: Array<(value: A) => void> = []

  constructor(
    private readonly refId: string,
    private readonly schema: Schema.Schema<A, any>
  ) {
    // Register with main process
    this.register()

    // Set up sync listener
    this.setupSyncListener()

    // Initialize with current value
    this.fetchCurrentValue().catch((err) =>
      console.error(`Error fetching initial value for IPCRef ${refId}:`, err)
    )
  }

  private register() {
    if (!window.ipcRef) {
      throw new Error(
        'ipcRef is not available in window. Make sure the preload script is correctly set up.'
      )
    }

    window.ipcRef.register(this.refId)

    // Clean up on window unload
    window.addEventListener('unload', () => {
      this.dispose()
    })
  }

  private setupSyncListener() {
    if (!window.ipcRef) return

    this.unsubscribe = window.ipcRef.subscribe<unknown>(this.refId, (serializedValue) => {
      try {
        const value = this.deserialize(serializedValue)
        this.currentValue = value

        // Notify all listeners
        this.listeners.forEach((listener) => {
          try {
            listener(value)
          } catch (error) {
            console.error(`Error in IPCRef listener for ${this.refId}:`, error)
          }
        })
      } catch (error) {
        console.error(`Error processing sync update for IPCRef ${this.refId}:`, error)
      }
    })
  }

  private unsubscribe: (() => void) | null = null

  private async fetchCurrentValue(): Promise<A | null> {
    if (!window.ipcRef) return null

    try {
      const serializedValue = await window.ipcRef.get<unknown>(this.refId)
      if (serializedValue === null) return null

      this.currentValue = this.deserialize(serializedValue)
      return this.currentValue
    } catch (error) {
      console.error(`Error fetching value for IPCRef ${this.refId}:`, error)
      return null
    }
  }

  /**
   * Serialize values for IPC transmission
   */
  private serialize(value: A): unknown {
    return Schema.encodeSync(this.schema)(value)
  }

  /**
   * Deserialize values from IPC transmission
   */
  private deserialize(value: unknown): A {
    return Schema.decodeUnknownSync(this.schema)(value)
  }

  /**
   * Get the current value of the ref
   */
  get = Effect.sync(() => {
    // If we already have a value, return it
    if (this.currentValue !== null) {
      return Effect.succeed(this.currentValue)
    }

    // Otherwise, fetch from main
    return Effect.tryPromise({
      try: () => this.fetchCurrentValue(),
      catch: (error) => new Error(`Failed to get value for IPCRef ${this.refId}: ${error}`)
    }).pipe(
      Effect.flatMap((value) => {
        if (value === null) {
          return Effect.fail(new Error(`Failed to get value for IPCRef ${this.refId}`))
        }
        return Effect.succeed(value)
      })
    )
  }).pipe(Effect.flatten)

  /**
   * Set the value of the ref
   */
  set = (value: A) =>
    Effect.sync(() => {
      if (!window.ipcRef) {
        throw new Error('ipcRef is not available')
      }

      const serialized = this.serialize(value)
      window.ipcRef.update(this.refId, serialized)

      // Optimistically update local value
      this.currentValue = value
    })

  /**
   * Update the value of the ref with a function
   */
  update = (f: (a: A) => A) => {
    return Effect.flatMap(this.get, (current) => this.set(f(current)))
  }

  /**
   * Subscribe to changes in the ref value
   */
  subscribe = (listener: (value: A) => void) =>
    Effect.sync(() => {
      this.listeners.push(listener)

      // If we already have a value, notify immediately
      if (this.currentValue !== null) {
        try {
          listener(this.currentValue)
        } catch (error) {
          console.error(`Error in initial IPCRef listener callback for ${this.refId}:`, error)
        }
      }

      // Return unsubscribe function
      return () => {
        this.listeners = this.listeners.filter((l) => l !== listener)
      }
    })

  /**
   * Clean up resources
   */
  dispose() {
    if (window.ipcRef) {
      window.ipcRef.unregister(this.refId)
    }

    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }

    this.listeners = []
  }
}

/**
 * Create an IPCRef in the renderer process
 */
export const createIPCRef = <A>(refId: string, schema: Schema.Schema<A, any>): IPCRef<A> => {
  return new IPCRef(refId, schema)
}
