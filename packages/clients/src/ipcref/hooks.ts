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
