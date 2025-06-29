# FileWatcher Usage Example

The FileWatcher resource provides file system watching capabilities using chokidar, integrated with Effect streams for reactive file change handling.

## Basic Usage

```typescript
import { Effect, Stream } from 'effect'
import { FileWatcherLive, FileWatcherTag, type FileWatchEvent } from '@slide.code/core'

// Create a file watcher for a directory
const config = {
  watchPath: '/path/to/watch',
  ignoreInitial: true,
  persistent: true
}

const program = Effect.gen(function* () {
  // Create the file watcher layer
  const fileWatcherLayer = FileWatcherLive(config)
  
  // Use the file watcher
  yield* Effect.gen(function* () {
    const fileWatcher = yield* FileWatcherTag
    
    // Subscribe to file change events
    yield* Effect.forkScoped(
      fileWatcher.events.pipe(
        Stream.runForEach((event: FileWatchEvent) =>
          Effect.gen(function* () {
            switch (event.type) {
              case 'add':
                yield* Effect.logInfo(`File added: ${event.path}`)
                break
              case 'change':
                yield* Effect.logInfo(`File changed: ${event.path}`)
                break
              case 'unlink':
                yield* Effect.logInfo(`File removed: ${event.path}`)
                break
              case 'addDir':
                yield* Effect.logInfo(`Directory added: ${event.path}`)
                break
              case 'unlinkDir':
                yield* Effect.logInfo(`Directory removed: ${event.path}`)
                break
              case 'ready':
                yield* Effect.logInfo('File watcher ready')
                break
              case 'error':
                yield* Effect.logError(`File watcher error: ${event.error}`)
                break
            }
          })
        )
      )
    )
    
    // Add additional paths to watch
    yield* fileWatcher.add(['/additional/path1', '/additional/path2'])
    
    // Get current state
    const state = yield* fileWatcher.getState()
    yield* Effect.logInfo(`Watcher state: ${JSON.stringify(state)}`)
    
    // Get watched paths
    const watchedPaths = yield* fileWatcher.getWatchedPaths()
    yield* Effect.logInfo(`Watched paths: ${JSON.stringify(watchedPaths)}`)
    
  }).pipe(Effect.provide(fileWatcherLayer))
})

// Run the program
Effect.runPromise(Effect.scoped(program))
```

## Configuration Options

```typescript
interface FileWatcherConfig {
  watchPath: string                    // Path to watch
  ignored?: string | RegExp | function // Files/paths to ignore
  persistent?: boolean                 // Keep process alive (default: true)
  ignoreInitial?: boolean             // Ignore initial add events (default: false)
  followSymlinks?: boolean            // Follow symbolic links (default: true)
  depth?: number                      // Limit recursion depth
  awaitWriteFinish?: boolean | {      // Wait for write operations to finish
    stabilityThreshold: number        // File size stability threshold (ms)
    pollInterval: number              // Polling interval (ms)
  }
  usePolling?: boolean                // Use polling instead of native events
  interval?: number                   // Polling interval for files (ms)
  binaryInterval?: number             // Polling interval for binary files (ms)
}
```

## Usage with TaskService

You can integrate the FileWatcher with TaskService to watch for changes in git repositories:

```typescript
import { TaskService, FileWatcherLive, GitRepoLive, FileWatcherTag, GitRepoTag } from '@slide.code/core'

const taskService = yield* TaskService

// Create a task with a git repository
const taskInfo = { id: 'task-123', projectId: 'my-project' }
const agent = yield* taskService.createAgent(taskInfo)

// Create git repo for the task's working directory
const gitRepoLayer = GitRepoLive({
  repoPath: agent.config.workingDirectory,
  branchName: 'feature/task-123',
  useWorktree: true
})

// Create file watcher for the git repo
const fileWatcherLayer = FileWatcherLive({
  watchPath: agent.config.workingDirectory,
  ignored: /(node_modules|\.git)/,
  ignoreInitial: true
})

// Combine layers and watch for file changes
yield* Effect.gen(function* () {
  const fileWatcher = yield* FileWatcherTag
  const gitRepo = yield* GitRepoTag
  
  // Watch for file changes and auto-commit
  yield* Effect.forkScoped(
    fileWatcher.events.pipe(
      Stream.filter((event) => ['add', 'change', 'unlink'].includes(event.type)),
      Stream.debounce('1 second'), // Debounce rapid changes
      Stream.runForEach(() =>
        Effect.gen(function* () {
          // Check status and commit changes
          const status = yield* gitRepo.status()
          if (status.files.length > 0) {
            yield* gitRepo.add('.')
            yield* gitRepo.commit(`Auto-commit: ${status.files.length} files changed`)
            yield* Effect.logInfo('Auto-committed changes')
          }
        })
      )
    )
  )
  
}).pipe(Effect.provide(Layer.merge(gitRepoLayer, fileWatcherLayer)))
```

## Event Stream Filtering

```typescript
// Filter events by type
const addEvents = fileWatcher.events.pipe(
  Stream.filter((event) => event.type === 'add')
)

// Filter events by path pattern
const jsFiles = fileWatcher.events.pipe(
  Stream.filter((event) => event.path.endsWith('.js'))
)

// Debounce rapid changes
const debouncedChanges = fileWatcher.events.pipe(
  Stream.filter((event) => event.type === 'change'),
  Stream.debounce('500 millis')
)
```

## Integration with ClaudeCodeAgent

Here's how you might use FileWatcher to monitor a Claude Code agent's working directory:

```typescript
import { Effect, Stream, Layer } from 'effect'
import { 
  TaskService, 
  FileWatcherLive, 
  FileWatcherTag,
  ClaudeCodeAgentLive,
  ClaudeCodeAgentTag,
  type FileWatchEvent 
} from '@slide.code/core'

const program = Effect.gen(function* () {
  const taskService = yield* TaskService
  
  // Create task and agent
  const taskInfo = { id: 'watch-task', projectId: 'my-project' }
  const agent = yield* taskService.createAgent(taskInfo)
  
  // Create file watcher for agent's working directory
  const fileWatcherLayer = FileWatcherLive({
    watchPath: agent.config.workingDirectory,
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**'
    ],
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1000,
      pollInterval: 100
    }
  })
  
  yield* Effect.gen(function* () {
    const fileWatcher = yield* FileWatcherTag
    
    // Monitor file changes and log them
    yield* Effect.forkScoped(
      fileWatcher.events.pipe(
        Stream.tap((event: FileWatchEvent) =>
          Effect.logInfo(`File event: ${event.type} - ${event.path}`)
        ),
        Stream.filter((event) => 
          ['add', 'change', 'unlink'].includes(event.type) &&
          (event.path.endsWith('.ts') || 
           event.path.endsWith('.js') || 
           event.path.endsWith('.json'))
        ),
        Stream.runForEach((event) =>
          Effect.logInfo(`Source code changed: ${event.path}`)
        )
      )
    )
    
    // Start the Claude Code agent
    yield* agent.run("Help me build a web application")
    
  }).pipe(Effect.provide(fileWatcherLayer))
})

// Run with proper scoping
Effect.runPromise(Effect.scoped(program))
```

## Error Handling

```typescript
const robustWatcher = Effect.gen(function* () {
  const fileWatcher = yield* FileWatcherTag
  
  yield* fileWatcher.events.pipe(
    Stream.runForEach((event) =>
      Effect.gen(function* () {
        if (event.type === 'error') {
          yield* Effect.logError(`FileWatcher error: ${event.error}`)
          // Handle error - maybe restart watcher or notify user
          return
        }
        
        // Process normal events
        yield* Effect.logInfo(`Processing: ${event.type} ${event.path}`)
      }).pipe(
        Effect.catchAll((error) =>
          Effect.logError(`Error processing file event: ${error}`)
        )
      )
    )
  )
}).pipe(
  Effect.catchAll((error) =>
    Effect.logError(`FileWatcher stream error: ${error}`)
  ),
  Effect.retry({ times: 3, delay: '1 second' })
)
``` 