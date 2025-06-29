# GitRepo Resource Usage Examples

The GitRepo resource provides git operations with a simple interface - just specify a repo path and whether to use a worktree or work directly on a branch. Worktrees are automatically organized in the vibe directory (`~/Documents/vibe-dir/worktrees/`).

## Basic Usage

```typescript
import { Effect, Scope } from 'effect'
import { GitRepo, GitRepoLive, GitRepoConfig } from '@slide.code/core'

// Work directly in the repository on a specific branch
const directConfig: GitRepoConfig = {
  repoPath: '/path/to/my-repo',
  branchName: 'feature/my-task',
  useWorktree: false, // Work directly in the repo
  autoInit: true
}

// Or use a worktree (automatically creates worktree in vibe directory)
const worktreeConfig: GitRepoConfig = {
  repoPath: '/path/to/my-repo',
  branchName: 'feature/my-task',
  useWorktree: true, // Creates worktree at ~/Documents/vibe-dir/worktrees/my-repo-feature-my-task/
  autoInit: true
}

// Use the Git resource
const program = Effect.gen(function* () {
  const git = yield* GitRepo
  
  // Initialize repository and setup branch/worktree
  yield* git.init()
  
  // Check status
  const status = yield* git.status()
  console.log('Repository status:', status)
  
  // Add files
  yield* git.add(['src/main.ts', 'README.md'])
  
  // Commit changes
  yield* git.commit('Add new feature implementation')
  
  // Get diff
  const diff = yield* git.diff()
  console.log('Current diff:', diff)
  
  // Get state to see where we're working
  const state = yield* git.getState()
  console.log('Working in:', state.workingPath)
  console.log('Using worktree:', state.useWorktree)
})

// Run the program with the git layer
const main = program.pipe(
  Effect.provide(GitRepoLive(worktreeConfig)),
  Effect.scoped
)

Effect.runPromise(main)
```

## Integration with TaskService

```typescript
import { Effect, Layer } from 'effect'
import { TaskService, TaskInfo, GitRepo, GitRepoLive } from '@slide.code/core'
import { UserRef } from '@slide.code/core'
import path from 'node:path'

// Enhanced TaskService with Git support
export class TaskServiceWithGit extends Effect.Service<TaskServiceWithGit>()('TaskServiceWithGit', {
  dependencies: [TaskService.Default, UserRef.Default],
  scoped: Effect.gen(function* () {
    const taskService = yield* TaskService
    const userRef = yield* UserRef
    
    const createAgentWithGitRepo = (taskInfo: TaskInfo, branchName: string, useWorktree = true) =>
      Effect.gen(function* () {
        const userState = yield* userRef.ref.get()
        
        if (!userState.vibeDirectory) {
          return yield* Effect.fail(new Error('Vibe directory not configured'))
        }
        
        // Create git repository configuration
        const repoPath = path.join(userState.vibeDirectory, 'project-repo')
        
        const gitConfig: GitRepoConfig = {
          repoPath,
          branchName,
          useWorktree, // Use worktree for isolation
          autoInit: true
        }
        
        // Create git repository and agent together
        yield* Effect.scoped(
          Effect.gen(function* () {
            // Provide git repository
            const git = yield* GitRepo
            
            // Initialize the repository and setup branch/worktree
            yield* git.init()
            
            // Get the working path (either repo or worktree)
            const state = yield* git.getState()
            
            // Create agent with the working directory
            const agent = yield* taskService.createAgent(
              { ...taskInfo, projectPath: state.workingPath },
              agentConfig
            )
            
            // Return both git and agent
            return { git, agent, workingPath: state.workingPath }
          }).pipe(
            Effect.provide(GitRepoLive(gitConfig))
          )
        )
      })
    
    return {
      createAgentWithGitRepo,
      // Delegate other methods to taskService
      createAgent: taskService.createAgent,
      getAgent: taskService.getAgent,
      removeAgent: taskService.removeAgent,
      createAgentEventStream: taskService.createAgentEventStream,
      createAgentEventStreamForTask: taskService.createAgentEventStreamForTask
    }
  })
}) {}
```

## Comparing Worktree vs Direct Branch

```typescript
import { Effect } from 'effect'
import { GitRepo, GitRepoLive } from '@slide.code/core'

// Example showing both approaches
const compareApproaches = Effect.gen(function* () {
  
  // Option 1: Work directly in repo (simpler, but less isolated)
  const directWorkflow = Effect.gen(function* () {
    const git = yield* GitRepo
    yield* git.init() // Creates/checks out the branch directly
    
    const state = yield* git.getState()
    yield* Effect.logInfo(`Working directly in: ${state.workingPath}`)
    yield* Effect.logInfo(`Branch: ${state.branchName}`)
  }).pipe(
    Effect.provide(GitRepoLive({
      repoPath: '/path/to/repo',
      branchName: 'feature/direct-work',
      useWorktree: false
    })),
    Effect.scoped
  )
  
  // Option 2: Use worktree (more isolated, safer for parallel work)
  const worktreeWorkflow = Effect.gen(function* () {
    const git = yield* GitRepo
    yield* git.init() // Creates worktree + branch
    
    const state = yield* git.getState()
    yield* Effect.logInfo(`Working in worktree: ${state.workingPath}`)
    yield* Effect.logInfo(`Branch: ${state.branchName}`)
  }).pipe(
    Effect.provide(GitRepoLive({
      repoPath: '/path/to/repo',
      branchName: 'feature/worktree-work',
      useWorktree: true
    })),
    Effect.scoped
  )
  
  // Run both approaches
  yield* directWorkflow
  yield* worktreeWorkflow
})
```

## Typical TaskService Integration

```typescript
import { Effect, Schedule, Duration } from 'effect'
import { GitRepo, GitRepoLive, TaskService } from '@slide.code/core'

const taskWithGitWorkflow = Effect.gen(function* () {
  const git = yield* GitRepo
  const taskService = yield* TaskService
  
  // Initialize the git setup
  yield* git.init()
  
  // Get the working path
  const state = yield* git.getState()
  
  // Create and run an agent in the working directory
  const agent = yield* taskService.createAgent({
    id: 'my-task',
    projectPath: state.workingPath
  })
  
  // Run the agent
  yield* Effect.fork(agent.run("Implement the requested feature"))
  
  // Monitor progress and commit changes periodically
  yield* Effect.repeat(
    Effect.gen(function* () {
      const status = yield* git.status()
      
      if (!status.isClean()) {
        // Get diff summary
        const diffSummary = yield* git.diffSummary()
        yield* Effect.logInfo(`Changes detected: ${diffSummary.files.length} files`)
        
        // Add all changes
        yield* git.add('.')
        
        // Commit with timestamp
        const timestamp = new Date().toISOString()
        yield* git.commit(`Auto-commit: ${timestamp}`)
        
        yield* Effect.logInfo('Changes committed successfully')
      }
    }),
    Schedule.spaced(Duration.minutes(5))
  )
})

// Run with worktree for isolation
const program = taskWithGitWorkflow.pipe(
  Effect.provide(TaskService.Default),
  Effect.provide(GitRepoLive({
    repoPath: '/path/to/project/repo',
    branchName: 'feature/auto-implementation',
    useWorktree: true, // Creates isolated worktree
    autoInit: true
  })),
  Effect.scoped
)
```

## Working with Multiple Tasks

```typescript
import { Effect } from 'effect'
import { GitRepo, GitRepoLive } from '@slide.code/core'

// Each task gets its own worktree for complete isolation
const multiTaskExample = Effect.gen(function* () {
  
  // Task 1: Authentication feature
  const task1 = Effect.gen(function* () {
    const git = yield* GitRepo
    yield* git.init()
    
    // Work on authentication
    yield* git.add('src/auth.ts')
    yield* git.commit('Add authentication system')
  }).pipe(
    Effect.provide(GitRepoLive({
      repoPath: '/project/main-repo',
      branchName: 'feature/auth',
      useWorktree: true // Creates ~/Documents/vibe-dir/worktrees/main-repo-feature-auth/
    })),
    Effect.scoped
  )
  
  // Task 2: UI improvements
  const task2 = Effect.gen(function* () {
    const git = yield* GitRepo
    yield* git.init()
    
    // Work on UI
    yield* git.add('src/ui/')
    yield* git.commit('Improve user interface')
  }).pipe(
    Effect.provide(GitRepoLive({
      repoPath: '/project/main-repo',
      branchName: 'feature/ui-improvements',
      useWorktree: true // Creates ~/Documents/vibe-dir/worktrees/main-repo-feature-ui-improvements/
    })),
    Effect.scoped
  )
  
  // Run both tasks in parallel (completely isolated)
  yield* Effect.all([task1, task2], { concurrency: 'unbounded' })
})
```

## Error Handling

```typescript
import { Effect, Match } from 'effect'
import { GitRepo, GitRepoError } from '@slide.code/core'

const safeGitOperations = Effect.gen(function* () {
  const git = yield* GitRepo
  
  const result = yield* git.init().pipe(
    Effect.andThen(git.add('.')),
    Effect.andThen(git.commit('Safe commit')),
    Effect.catchTag('GitRepoError', (error) =>
      Match.value(error.message).pipe(
        Match.when(
          (msg) => msg.includes('nothing to commit'),
          () => Effect.logInfo('Repository is clean, nothing to commit')
        ),
        Match.when(
          (msg) => msg.includes('Failed to initialize'),
          () => Effect.logError('Could not initialize repository, check permissions')
        ),
        Match.orElse(() => Effect.logError(`Git error: ${error.message}`))
      )
    )
  )
})
```

## Key Features

- **Simple Configuration**: Just specify repo path, branch name, and worktree flag
- **Automatic Path Management**: Worktree paths are generated automatically
- **Flexible Working Modes**: Choose between direct branch work or isolated worktrees  
- **Automatic Setup**: Creates repositories, branches, and worktrees as needed
- **Automatic Cleanup**: Removes worktrees when the resource scope ends
- **TaskService Ready**: Perfect integration with ClaudeCodeAgent workflows
- **Type Safety**: Full TypeScript support with proper Effect types

## Configuration Options

- `repoPath`: Path to the main git repository
- `branchName`: Name of the branch to work on
- `useWorktree`: Boolean flag - if true, creates a worktree; if false, works directly in repo
- `autoInit`: Whether to automatically initialize and setup everything

## Vibe Directory Structure

When using worktrees (`useWorktree: true`), the GitRepo resource automatically organizes everything in the vibe directory:

```
~/Documents/vibe-dir/
├── worktrees/
│   ├── my-project-feature-auth/          # Worktree for feature/auth branch
│   ├── my-project-feature-ui-improvements/  # Worktree for feature/ui-improvements
│   └── another-repo-bugfix-123/          # Worktree for different repo
└── ... (other vibe directory contents)
```

The naming pattern is: `<projectName>-<branchName>` where special characters in branch names are replaced with hyphens.

## When to Use Worktrees vs Direct Branch

**Use Worktrees (`useWorktree: true`) when:**
- Running multiple tasks/agents in parallel
- Need complete isolation between different features
- Working in a team environment
- Want to avoid conflicts between different development streams

**Use Direct Branch (`useWorktree: false`) when:**
- Simple single-task workflow
- Working alone on a feature
- Don't need the overhead of worktree management
- Want to work directly in the main repository

This approach gives you maximum flexibility with minimal configuration! 