import { Effect, Context, Stream, Scope, PubSub, Ref, Layer, Schema } from 'effect'
import chokidar, { type FSWatcher } from 'chokidar'
import { Stats } from 'node:fs'

export class FileWatcherError extends Error {
  readonly _tag = 'FileWatcherError'
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message)
    this.name = 'FileWatcherError'
  }
}

// Schema for file watch events
export const FileWatchEvent = Schema.Struct({
  type: Schema.Literal('add', 'change', 'unlink', 'addDir', 'unlinkDir', 'ready', 'error'),
  path: Schema.String,
  stats: Schema.optional(Schema.Unknown), // fs.Stats object
  timestamp: Schema.Number,
  error: Schema.optional(Schema.String)
})

export type FileWatchEvent = Schema.Schema.Type<typeof FileWatchEvent>

export interface FileWatcherConfig {
  watchPath: string
  ignored?: string | RegExp | ((path: string, stats?: Stats) => boolean)
  persistent?: boolean
  ignoreInitial?: boolean
  followSymlinks?: boolean
  depth?: number
  awaitWriteFinish?:
    | boolean
    | {
        stabilityThreshold: number
        pollInterval: number
      }
  usePolling?: boolean
  interval?: number
  binaryInterval?: number
}

export interface FileWatcherState {
  isWatching: boolean
  watchedPaths: string[]
  error: string | null
}

export interface FileWatcher {
  readonly config: FileWatcherConfig
  readonly state: Ref.Ref<FileWatcherState>
  readonly events: Stream.Stream<FileWatchEvent>

  readonly start: () => Effect.Effect<void, FileWatcherError>
  readonly stop: () => Effect.Effect<void, FileWatcherError>
  readonly add: (paths: string | string[]) => Effect.Effect<void, FileWatcherError>
  readonly unwatch: (paths: string | string[]) => Effect.Effect<void, FileWatcherError>
  readonly getWatchedPaths: () => Effect.Effect<Record<string, string[]>, FileWatcherError>
  readonly getState: () => Effect.Effect<FileWatcherState>
}

export class FileWatcherTag extends Context.Tag('FileWatcher')<FileWatcherTag, FileWatcher>() {}

export const makeFileWatcher = (
  config: FileWatcherConfig
): Effect.Effect<FileWatcher, FileWatcherError, Scope.Scope> =>
  Effect.gen(function* () {
    const eventsPubSub = yield* PubSub.unbounded<FileWatchEvent>()
    const watcherRef = yield* Ref.make<FSWatcher | null>(null)

    const initialState: FileWatcherState = {
      isWatching: false,
      watchedPaths: [],
      error: null
    }

    const state = yield* Ref.make(initialState)

    yield* Effect.logInfo(`[FileWatcher] Creating file watcher for: ${config.watchPath}`)

    const createWatchEvent = (
      type: FileWatchEvent['type'],
      eventPath: string,
      stats?: Stats,
      error?: string
    ): FileWatchEvent => ({
      type,
      path: eventPath,
      stats,
      timestamp: Date.now(),
      error
    })

    const start = () =>
      Effect.gen(function* () {
        const currentWatcher = yield* Ref.get(watcherRef)
        if (currentWatcher) {
          return yield* Effect.fail(new FileWatcherError('File watcher is already running'))
        }

        const chokidarOptions = {
          ignored: config.ignored,
          persistent: config.persistent ?? true,
          ignoreInitial: config.ignoreInitial ?? false,
          followSymlinks: config.followSymlinks ?? true,
          depth: config.depth,
          awaitWriteFinish: config.awaitWriteFinish ?? false,
          usePolling: config.usePolling ?? false,
          interval: config.interval ?? 100,
          binaryInterval: config.binaryInterval ?? 300
        }

        const watcher = chokidar.watch(config.watchPath, chokidarOptions)

        // Set up event listeners
        watcher
          .on('add', (path, stats) => {
            const event = createWatchEvent('add', path, stats)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
          })
          .on('change', (path, stats) => {
            const event = createWatchEvent('change', path, stats)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
          })
          .on('unlink', (path) => {
            const event = createWatchEvent('unlink', path)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
          })
          .on('addDir', (path, stats) => {
            const event = createWatchEvent('addDir', path, stats)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
          })
          .on('unlinkDir', (path) => {
            const event = createWatchEvent('unlinkDir', path)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
          })
          .on('ready', () => {
            const event = createWatchEvent('ready', config.watchPath)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
            Effect.runFork(Ref.update(state, (s) => ({ ...s, isWatching: true, error: null })))
          })
          .on('error', (error: unknown) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const event = createWatchEvent('error', config.watchPath, undefined, errorMessage)
            Effect.runFork(PubSub.publish(eventsPubSub, event))
            Effect.runFork(Ref.update(state, (s) => ({ ...s, error: errorMessage })))
          })

        yield* Ref.set(watcherRef, watcher)
        yield* Effect.logInfo(`[FileWatcher] Started watching: ${config.watchPath}`)
      })

    const stop = () =>
      Effect.gen(function* () {
        const watcher = yield* Ref.get(watcherRef)
        if (!watcher) {
          return
        }

        yield* Effect.sync(() => watcher.close())

        yield* Ref.set(watcherRef, null)
        yield* Ref.update(state, (s) => ({ ...s, isWatching: false }))
        yield* Effect.logInfo(`[FileWatcher] Stopped watching: ${config.watchPath}`)
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(new FileWatcherError(`Failed to stop file watcher: ${error}`))
        )
      )

    const add = (paths: string | string[]) =>
      Effect.gen(function* () {
        const watcher = yield* Ref.get(watcherRef)
        if (!watcher) {
          return yield* Effect.fail(new FileWatcherError('File watcher is not running'))
        }

        yield* Effect.sync(() => watcher.add(paths))
        yield* Effect.logInfo(
          `[FileWatcher] Added paths to watch: ${Array.isArray(paths) ? paths.join(', ') : paths}`
        )
      })

    const unwatch = (paths: string | string[]) =>
      Effect.gen(function* () {
        const watcher = yield* Ref.get(watcherRef)
        if (!watcher) {
          return yield* Effect.fail(new FileWatcherError('File watcher is not running'))
        }

        yield* Effect.sync(() => watcher.unwatch(paths))
        yield* Effect.logInfo(
          `[FileWatcher] Removed paths from watch: ${Array.isArray(paths) ? paths.join(', ') : paths}`
        )
      }).pipe(
        Effect.catchAll((error) =>
          Effect.fail(new FileWatcherError(`Failed to unwatch paths: ${error}`))
        )
      )

    const getWatchedPaths = () =>
      Effect.gen(function* () {
        const watcher = yield* Ref.get(watcherRef)
        if (!watcher) {
          return yield* Effect.fail(new FileWatcherError('File watcher is not running'))
        }

        return yield* Effect.sync(() => watcher.getWatched())
      })

    const getState = () => Ref.get(state)

    const events = Stream.fromPubSub(eventsPubSub)

    // Start automatically if configured
    if (config.persistent !== false) {
      yield* start()
    }

    // Cleanup function
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[FileWatcher] Cleaning up file watcher resources')
        yield* stop().pipe(Effect.orElse(() => Effect.void))
        yield* Effect.sync(() => PubSub.shutdown(eventsPubSub))
        yield* Effect.logInfo('[FileWatcher] File watcher cleanup complete')
      })
    )

    return {
      config,
      state,
      events,
      start,
      stop,
      add,
      unwatch,
      getWatchedPaths,
      getState
    }
  })

export const FileWatcherLive = (config: FileWatcherConfig) =>
  Layer.scoped(FileWatcherTag, makeFileWatcher(config))
