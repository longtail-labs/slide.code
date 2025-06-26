import { useCallback, useEffect, useRef, useState } from 'react'
import { Effect, Schema } from 'effect'
import { IPCRef, createIPCRef } from './impl.js'

/**
 * React hook for using an IPCRef
 *
 * @example
 * const [appReady, setAppReady, updateAppReady] = useIPCRef('app-ready', AppReadySchema)
 *
 * return (
 *   <div>
 *     {appReady?.isReady ? 'App is ready!' : 'Loading...'}
 *   </div>
 * )
 */
export function useIPCRef<A>(
  refId: string,
  schema: Schema.Schema<A, any>
): [A | null, (value: A) => void, (updater: (value: A) => A) => void] {
  const [value, setValue] = useState<A | null>(null)
  const refInstance = useRef<IPCRef<A> | null>(null)

  useEffect(() => {
    // Create the ref instance
    const ref = createIPCRef(refId, schema)
    refInstance.current = ref

    // Get initial value and set up subscription
    Effect.runPromise(ref.get)
      .then(setValue)
      .catch((err) => console.error(`Error getting initial value for ${refId}:`, err))

    let unsubscribe: (() => void) | undefined

    Effect.runPromise(ref.subscribe(setValue))
      .then((unsub) => {
        unsubscribe = unsub
      })
      .catch((err) => console.error(`Error subscribing to ${refId}:`, err))

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      ref.dispose()
    }
  }, [refId, schema])

  // Handle setting the ref value
  const setRef = useCallback(
    (newValue: A) => {
      if (refInstance.current) {
        Effect.runPromise(refInstance.current.set(newValue)).catch((err) =>
          console.error(`Error setting value for ${refId}:`, err)
        )
      }
    },
    [refId]
  )

  // Handle updating the ref value
  const updateRef = useCallback(
    (updater: (value: A) => A) => {
      if (refInstance.current) {
        Effect.runPromise(refInstance.current.update(updater)).catch((err) =>
          console.error(`Error updating value for ${refId}:`, err)
        )
      }
    },
    [refId]
  )

  return [value, setRef, updateRef]
}

// import { useCallback, useEffect, useRef, useState } from 'react'
// import { Effect, Schema } from 'effect'
// import { IPCRef, createIPCRef } from './impl.js'

// /**
//  * React hook for using an IPCRef
//  *
//  * @example
//  * const [appReady, setAppReady, updateAppReady] = useIPCRef('app-ready', AppReadySchema)
//  *
//  * return (
//  *   <div>
//  *     {appReady?.isReady ? 'App is ready!' : 'Loading...'}
//  *   </div>
//  * )
//  */
// export function useIPCRef<A>(
//   refId: string,
//   schema: Schema.Schema<A, any>
// ): [A | null, (value: A) => void, (updater: (value: A) => A) => void] {
//   console.log(`[useIPCRef:${refId}] 🎣 Initializing React hook`)

//   const [value, setValue] = useState<A | null>(null)
//   const refInstance = useRef<IPCRef<A> | null>(null)

//   useEffect(() => {
//     console.log(`[useIPCRef:${refId}] 🔧 Effect triggered - setting up IPCRef`)

//     // Create the ref instance
//     const ref = createIPCRef(refId, schema)
//     refInstance.current = ref
//     console.log(`[useIPCRef:${refId}] ✅ IPCRef instance created and stored`)

//     // Get initial value and set up subscription
//     console.log(`[useIPCRef:${refId}] 🔍 Getting initial value`)
//     Effect.runPromise(ref.get)
//       .then((initialValue) => {
//         console.log(`[useIPCRef:${refId}] ✅ Got initial value:`, initialValue)
//         setValue(initialValue)
//       })
//       .catch((err) => {
//         console.error(`[useIPCRef:${refId}] ❌ Error getting initial value:`, err)
//       })

//     let unsubscribe: (() => void) | undefined

//     console.log(`[useIPCRef:${refId}] 📺 Setting up subscription`)
//     Effect.runPromise(
//       ref.subscribe((newValue) => {
//         console.log(`[useIPCRef:${refId}] 🔄 Subscription callback triggered with value:`, newValue)
//         setValue(newValue)
//       })
//     )
//       .then((unsub) => {
//         console.log(`[useIPCRef:${refId}] ✅ Subscription established`)
//         unsubscribe = unsub
//       })
//       .catch((err) => {
//         console.error(`[useIPCRef:${refId}] ❌ Error subscribing:`, err)
//       })

//     // Cleanup
//     return () => {
//       console.log(`[useIPCRef:${refId}] 🧹 Cleanup triggered`)

//       if (unsubscribe) {
//         console.log(`[useIPCRef:${refId}] 🔇 Unsubscribing from changes`)
//         unsubscribe()
//       }

//       console.log(`[useIPCRef:${refId}] 🗑️ Disposing IPCRef instance`)
//       ref.dispose()
//       console.log(`[useIPCRef:${refId}] ✅ Cleanup completed`)
//     }
//   }, [refId, schema])

//   // Handle setting the ref value
//   const setRef = useCallback(
//     (newValue: A) => {
//       console.log(`[useIPCRef:${refId}] 📤 Setting new value via React callback:`, newValue)

//       if (refInstance.current) {
//         Effect.runPromise(refInstance.current.set(newValue))
//           .then(() => {
//             console.log(`[useIPCRef:${refId}] ✅ Value set successfully via React callback`)
//           })
//           .catch((err) => {
//             console.error(`[useIPCRef:${refId}] ❌ Error setting value via React callback:`, err)
//           })
//       } else {
//         console.error(`[useIPCRef:${refId}] ❌ Cannot set value - no IPCRef instance available`)
//       }
//     },
//     [refId]
//   )

//   // Handle updating the ref value
//   const updateRef = useCallback(
//     (updater: (value: A) => A) => {
//       console.log(`[useIPCRef:${refId}] 🔄 Updating value via React callback with function`)

//       if (refInstance.current) {
//         Effect.runPromise(refInstance.current.update(updater))
//           .then(() => {
//             console.log(`[useIPCRef:${refId}] ✅ Value updated successfully via React callback`)
//           })
//           .catch((err) => {
//             console.error(`[useIPCRef:${refId}] ❌ Error updating value via React callback:`, err)
//           })
//       } else {
//         console.error(`[useIPCRef:${refId}] ❌ Cannot update value - no IPCRef instance available`)
//       }
//     },
//     [refId]
//   )

//   console.log(`[useIPCRef:${refId}] 📊 Hook returning - current value:`, value)
//   return [value, setRef, updateRef]
// }
