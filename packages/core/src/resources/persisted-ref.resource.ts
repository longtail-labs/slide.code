import { Effect, Schema, SubscriptionRef, Stream, Fiber, Scope } from 'effect'
import { ElectronStoreUtil } from '../utils/electron-store.util.js'

/**
 * Persistence options for PersistedRef
 */
export interface PersistOptions {
  /**
   * Whether to persist the ref value
   */
  persist: boolean
  /**
   * Custom key to use for persistence
   * If not provided, the default is `persistedref-{id}`
   */
  key?: string
}

/**
 * Interface for PersistedRef
 */
export interface PersistedRef<A> {
  /**
   * The unique identifier for this ref
   */
  readonly id: string
  /**
   * The schema used for encoding/decoding values
   */
  readonly schema: Schema.Schema<A, any>
  /**
   * The persistence options
   */
  readonly persistOptions: PersistOptions
  /**
   * The underlying subscription ref
   */
  readonly ref: SubscriptionRef.SubscriptionRef<A>
  /**
   * Stream of changes to the ref's value
   */
  readonly changes: Stream.Stream<A>
  /**
   * Get the current value
   */
  get: () => Effect.Effect<A>
  /**
   * Set a new value
   */
  set: (value: A) => Effect.Effect<void>
  /**
   * Update the value with a function
   */
  update: (f: (a: A) => A) => Effect.Effect<void>
  /**
   * Update the value with an effect
   */
  updateEffect: <R, E>(f: (a: A) => Effect.Effect<A, E, R>) => Effect.Effect<void, E, R>
}

/**
 * Creates a PersistedRef with the given initial value, schema for serialization, and persistence options
 */
export const makePersistedRef = <A>(
  id: string,
  initialValue: A,
  schema: Schema.Schema<A, any>,
  persistOptions: PersistOptions
): Effect.Effect<PersistedRef<A>, never, Scope.Scope> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(`[PersistedRef] Creating PersistedRef: ${id}`)

    // Rehydrate from storage if persistence is enabled
    let startValue = initialValue
    if (persistOptions.persist) {
      const storeKey = persistOptions.key || `persistedref-${id}`
      const storedValue = ElectronStoreUtil.get(storeKey)

      if (storedValue) {
        try {
          yield* Effect.logInfo(`[PersistedRef] Rehydrating ${id} from storage`)
          startValue = Schema.decodeUnknownSync(schema)(storedValue)
        } catch (error) {
          yield* Effect.logWarning(
            `[PersistedRef] Failed to rehydrate ${id}, using initial value: ${error}`
          )
        }
      }
    }

    // Create the subscription ref
    const ref = yield* SubscriptionRef.make(startValue)

    // Persist changes whenever the value is updated
    const persistChanges = (value: A) =>
      Effect.sync(() => {
        if (persistOptions.persist) {
          try {
            const storeKey = persistOptions.key || `persistedref-${id}`
            const serialized = Schema.encodeSync(schema)(value)
            ElectronStoreUtil.set(storeKey, serialized)
          } catch (error) {
            console.error(`Error persisting PersistedRef ${id}:`, error)
          }
        }
      })

    // Setup tracking to persist changes
    yield* Effect.forkScoped(
      ref.changes.pipe(
        Stream.tap((value) => Effect.logInfo(`[PersistedRef] Value changed for ${id}`)),
        Stream.tap((value) => persistChanges(value)),
        Stream.runDrain
      )
    )

    // Create and return the PersistedRef interface
    return {
      id,
      schema,
      persistOptions,
      ref,
      changes: ref.changes,
      get: () => SubscriptionRef.get(ref),
      set: (value: A) => SubscriptionRef.set(ref, value),
      update: (f: (a: A) => A) => SubscriptionRef.update(ref, f),
      updateEffect: <R, E>(f: (a: A) => Effect.Effect<A, E, R>) =>
        SubscriptionRef.updateEffect(ref, f)
    }
  })

/**
 * Creates a non-persisted PersistedRef (useful for testing or temporary state)
 */
export const makeRef = <A>(
  id: string,
  initialValue: A,
  schema: Schema.Schema<A, any>
): Effect.Effect<PersistedRef<A>, never, Scope.Scope> =>
  makePersistedRef(id, initialValue, schema, { persist: false })

/**
 * Utility to listen for changes with a callback
 */
export const onChange = <A>(
  ref: PersistedRef<A>,
  callback: (value: A) => void
): Effect.Effect<Fiber.RuntimeFiber<void, never>> =>
  Effect.gen(function* () {
    // Get the subscription ref's changes stream
    const changes = ref.changes

    // Map the stream to only emit distinct values
    const distinctChanges = Stream.changes(changes)

    // Run the stream, executing the callback for each change
    const fiber = yield* Stream.runForEach(distinctChanges, (value) =>
      Effect.sync(() => callback(value))
    ).pipe(Effect.fork)

    // Return the fiber so it can be interrupted if needed
    return fiber
  })
