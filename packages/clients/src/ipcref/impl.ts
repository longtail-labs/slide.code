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

// import { Effect, Schema } from 'effect'

// /**
//  * Renderer-side implementation of IPCRef
//  * This provides a client that can communicate with the main process SubscriptionRef
//  */
// export class IPCRef<A> {
//   private currentValue: A | null = null
//   private listeners: Array<(value: A) => void> = []

//   constructor(
//     private readonly refId: string,
//     private readonly schema: Schema.Schema<A, any>
//   ) {
//     console.log(`[IPCRef:${this.refId}] 🏗️ Creating new IPCRef instance`)

//     // Register with main process
//     this.register()

//     // Set up sync listener
//     this.setupSyncListener()

//     // Initialize with current value
//     this.fetchCurrentValue().catch((err) => {
//       console.error(`[IPCRef:${this.refId}] ❌ Error fetching initial value:`, err)
//     })
//   }

//   private register() {
//     if (!window.ipcRef) {
//       const error =
//         'ipcRef is not available in window. Make sure the preload script is correctly set up.'
//       console.error(`[IPCRef:${this.refId}] ❌ Registration failed:`, error)
//       throw new Error(error)
//     }

//     console.log(`[IPCRef:${this.refId}] 📝 Registering with main process`)
//     window.ipcRef.register(this.refId)
//     console.log(`[IPCRef:${this.refId}] ✅ Successfully registered with main process`)

//     // Clean up on window unload
//     window.addEventListener('unload', () => {
//       console.log(`[IPCRef:${this.refId}] 🧹 Window unload detected, disposing IPCRef`)
//       this.dispose()
//     })
//   }

//   private setupSyncListener() {
//     if (!window.ipcRef) {
//       console.error(`[IPCRef:${this.refId}] ❌ Cannot setup sync listener - ipcRef not available`)
//       return
//     }

//     console.log(`[IPCRef:${this.refId}] 👂 Setting up sync listener`)

//     this.unsubscribe = window.ipcRef.subscribe<unknown>(this.refId, (serializedValue) => {
//       console.log(`[IPCRef:${this.refId}] 📨 Received sync update:`, serializedValue)

//       try {
//         const value = this.deserialize(serializedValue)
//         console.log(`[IPCRef:${this.refId}] ✅ Successfully deserialized value:`, value)

//         this.currentValue = value

//         // Notify all listeners
//         console.log(`[IPCRef:${this.refId}] 📢 Notifying ${this.listeners.length} listeners`)
//         this.listeners.forEach((listener, index) => {
//           try {
//             listener(value)
//             console.log(`[IPCRef:${this.refId}] ✅ Listener ${index} notified successfully`)
//           } catch (error) {
//             console.error(`[IPCRef:${this.refId}] ❌ Error in listener ${index}:`, error)
//           }
//         })
//       } catch (error) {
//         console.error(`[IPCRef:${this.refId}] ❌ Error processing sync update:`, error)
//       }
//     })

//     console.log(`[IPCRef:${this.refId}] ✅ Sync listener setup complete`)
//   }

//   private unsubscribe: (() => void) | null = null

//   private async fetchCurrentValue(): Promise<A | null> {
//     if (!window.ipcRef) {
//       console.error(`[IPCRef:${this.refId}] ❌ Cannot fetch current value - ipcRef not available`)
//       return null
//     }

//     try {
//       console.log(`[IPCRef:${this.refId}] 🔍 Fetching current value from main process`)
//       const serializedValue = await window.ipcRef.get<unknown>(this.refId)

//       if (serializedValue === null) {
//         console.log(`[IPCRef:${this.refId}] ℹ️ No current value available`)
//         return null
//       }

//       console.log(`[IPCRef:${this.refId}] 📥 Received serialized value:`, serializedValue)
//       this.currentValue = this.deserialize(serializedValue)
//       console.log(
//         `[IPCRef:${this.refId}] ✅ Successfully fetched and deserialized current value:`,
//         this.currentValue
//       )

//       return this.currentValue
//     } catch (error) {
//       console.error(`[IPCRef:${this.refId}] ❌ Error fetching current value:`, error)
//       return null
//     }
//   }

//   /**
//    * Serialize values for IPC transmission
//    */
//   private serialize(value: A): unknown {
//     try {
//       console.log(`[IPCRef:${this.refId}] 🔄 Serializing value:`, value)
//       const serialized = Schema.encodeSync(this.schema)(value)
//       console.log(`[IPCRef:${this.refId}] ✅ Successfully serialized value:`, serialized)
//       return serialized
//     } catch (error) {
//       console.error(`[IPCRef:${this.refId}] ❌ Error serializing value:`, error)
//       throw error
//     }
//   }

//   /**
//    * Deserialize values from IPC transmission
//    */
//   private deserialize(value: unknown): A {
//     try {
//       console.log(`[IPCRef:${this.refId}] 🔄 Deserializing value:`, value)
//       const deserialized = Schema.decodeUnknownSync(this.schema)(value)
//       console.log(`[IPCRef:${this.refId}] ✅ Successfully deserialized value:`, deserialized)
//       return deserialized
//     } catch (error) {
//       console.error(`[IPCRef:${this.refId}] ❌ Error deserializing value:`, error)
//       throw error
//     }
//   }

//   /**
//    * Get the current value of the ref
//    */
//   get = Effect.sync(() => {
//     console.log(`[IPCRef:${this.refId}] 🔍 Getting current value`)

//     // If we already have a value, return it
//     if (this.currentValue !== null) {
//       console.log(`[IPCRef:${this.refId}] ✅ Returning cached value:`, this.currentValue)
//       return Effect.succeed(this.currentValue)
//     }

//     console.log(`[IPCRef:${this.refId}] 📡 No cached value, fetching from main process`)
//     // Otherwise, fetch from main
//     return Effect.tryPromise({
//       try: () => this.fetchCurrentValue(),
//       catch: (error) => {
//         console.error(`[IPCRef:${this.refId}] ❌ Failed to get value:`, error)
//         return new Error(`Failed to get value for IPCRef ${this.refId}: ${error}`)
//       }
//     }).pipe(
//       Effect.flatMap((value) => {
//         if (value === null) {
//           console.error(`[IPCRef:${this.refId}] ❌ Failed to get value - null returned`)
//           return Effect.fail(new Error(`Failed to get value for IPCRef ${this.refId}`))
//         }
//         console.log(`[IPCRef:${this.refId}] ✅ Successfully got value:`, value)
//         return Effect.succeed(value)
//       })
//     )
//   }).pipe(Effect.flatten)

//   /**
//    * Set the value of the ref
//    */
//   set = (value: A) =>
//     Effect.sync(() => {
//       console.log(`[IPCRef:${this.refId}] 📤 Setting value:`, value)

//       if (!window.ipcRef) {
//         const error = 'ipcRef is not available'
//         console.error(`[IPCRef:${this.refId}] ❌ Cannot set value:`, error)
//         throw new Error(error)
//       }

//       const serialized = this.serialize(value)
//       console.log(`[IPCRef:${this.refId}] 📡 Sending update to main process`)
//       window.ipcRef.update(this.refId, serialized)

//       // Optimistically update local value
//       this.currentValue = value
//       console.log(`[IPCRef:${this.refId}] ✅ Value set successfully (optimistic update)`)
//     })

//   /**
//    * Update the value of the ref with a function
//    */
//   update = (f: (a: A) => A) => {
//     console.log(`[IPCRef:${this.refId}] 🔄 Updating value with function`)
//     return Effect.flatMap(this.get, (current) => {
//       console.log(`[IPCRef:${this.refId}] 📊 Current value for update:`, current)
//       const newValue = f(current)
//       console.log(`[IPCRef:${this.refId}] 🆕 New value after function:`, newValue)
//       return this.set(newValue)
//     })
//   }

//   /**
//    * Subscribe to changes in the ref value
//    */
//   subscribe = (listener: (value: A) => void) =>
//     Effect.sync(() => {
//       console.log(`[IPCRef:${this.refId}] 📺 Adding new subscription listener`)
//       this.listeners.push(listener)
//       console.log(`[IPCRef:${this.refId}] 📊 Total listeners: ${this.listeners.length}`)

//       // If we already have a value, notify immediately
//       if (this.currentValue !== null) {
//         console.log(
//           `[IPCRef:${this.refId}] 📨 Notifying new listener immediately with current value:`,
//           this.currentValue
//         )
//         try {
//           listener(this.currentValue)
//           console.log(`[IPCRef:${this.refId}] ✅ New listener notified successfully`)
//         } catch (error) {
//           console.error(`[IPCRef:${this.refId}] ❌ Error in initial listener callback:`, error)
//         }
//       }

//       // Return unsubscribe function
//       return () => {
//         console.log(`[IPCRef:${this.refId}] 🗑️ Unsubscribing listener`)
//         const initialCount = this.listeners.length
//         this.listeners = this.listeners.filter((l) => l !== listener)
//         console.log(
//           `[IPCRef:${this.refId}] 📊 Listeners: ${initialCount} -> ${this.listeners.length}`
//         )
//       }
//     })

//   /**
//    * Clean up resources
//    */
//   dispose() {
//     console.log(`[IPCRef:${this.refId}] 🧹 Disposing IPCRef`)

//     if (window.ipcRef) {
//       console.log(`[IPCRef:${this.refId}] 📝 Unregistering from main process`)
//       window.ipcRef.unregister(this.refId)
//     }

//     if (this.unsubscribe) {
//       console.log(`[IPCRef:${this.refId}] 🔇 Removing sync listener`)
//       this.unsubscribe()
//       this.unsubscribe = null
//     }

//     const listenerCount = this.listeners.length
//     this.listeners = []
//     console.log(`[IPCRef:${this.refId}] 🧹 Cleaned up ${listenerCount} listeners`)
//     console.log(`[IPCRef:${this.refId}] ✅ IPCRef disposed successfully`)
//   }
// }

// /**
//  * Create an IPCRef in the renderer process
//  */
// export const createIPCRef = <A>(refId: string, schema: Schema.Schema<A, any>): IPCRef<A> => {
//   console.log(`[IPCRef] 🏗️ Creating IPCRef for refId: ${refId}`)
//   const ref = new IPCRef(refId, schema)
//   console.log(`[IPCRef] ✅ IPCRef created successfully for refId: ${refId}`)
//   return ref
// }
