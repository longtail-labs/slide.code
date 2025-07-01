import { Effect, Context, Ref, Scope, Layer } from 'effect'
import { simpleGit, SimpleGit, type StatusResult, type DiffResult } from 'simple-git'
import log from 'electron-log'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { createVibeDir } from '../../effects/createVibeDir.effect.js'

export class GitRepoError extends Error {
  readonly _tag = 'GitRepoError'
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message)
    this.name = 'GitRepoError'
  }
}

export interface GitRepoState {
  repoPath: string
  workingPath: string
  branchName: string
  useWorktree: boolean
  isInitialized: boolean
  worktreeCreated: boolean
}

export interface GitRepoConfig {
  repoPath: string
  branchName: string
  useWorktree?: boolean
  autoInit?: boolean
}

export interface GitRepo {
  readonly git: SimpleGit
  readonly config: GitRepoConfig
  readonly state: Ref.Ref<GitRepoState>

  // Repository operations
  readonly init: () => Effect.Effect<void, GitRepoError>
  readonly status: () => Effect.Effect<StatusResult, GitRepoError>
  readonly diff: (options?: string[]) => Effect.Effect<string, GitRepoError>
  readonly diffStaged: () => Effect.Effect<string, GitRepoError>
  readonly gitDiffIncludingUntracked: () => Effect.Effect<string, GitRepoError>
  readonly diffSummary: (options?: string[]) => Effect.Effect<DiffResult, GitRepoError>
  readonly commit: (message: string, files?: string[]) => Effect.Effect<void, GitRepoError>
  readonly add: (files: string | string[]) => Effect.Effect<void, GitRepoError>
  readonly checkout: (branch: string) => Effect.Effect<void, GitRepoError>
  readonly createBranch: (
    branchName: string,
    startPoint?: string
  ) => Effect.Effect<void, GitRepoError>

  // State access
  readonly getState: () => Effect.Effect<GitRepoState>
}

export class GitRepoTag extends Context.Tag('GitRepo')<GitRepoTag, GitRepo>() {}

export const makeGitRepo = (
  config: GitRepoConfig
): Effect.Effect<GitRepo, GitRepoError, Scope.Scope> =>
  Effect.gen(function* () {
    const useWorktree = config.useWorktree ?? false

    // Determine working path
    let workingPath: string
    if (useWorktree) {
      // Create vibe directory and use it for worktrees
      const vibeDir = yield* createVibeDir.pipe(
        Effect.mapError(
          (error) => new GitRepoError(`Failed to create vibe directory: ${error.message}`)
        )
      )
      const projectName = path.basename(config.repoPath)
      const safeBranchName = config.branchName.replace(/[^a-zA-Z0-9]/g, '-')
      const worktreesDir = path.join(vibeDir, 'worktrees')
      workingPath = path.join(worktreesDir, `${projectName}-${safeBranchName}`)
    } else {
      workingPath = config.repoPath
    }

    const mainGit = simpleGit(config.repoPath)
    const workingGit = simpleGit(workingPath)

    const initialState: GitRepoState = {
      repoPath: config.repoPath,
      workingPath,
      branchName: config.branchName,
      useWorktree,
      isInitialized: false,
      worktreeCreated: false
    }

    const state = yield* Ref.make(initialState)

    yield* Effect.logInfo(`[GitRepo] Creating Git repository handler`)
    yield* Effect.logInfo(`[GitRepo] Repo: ${config.repoPath}`)
    yield* Effect.logInfo(`[GitRepo] Working in: ${workingPath} (useWorktree: ${useWorktree})`)
    yield* Effect.logInfo(`[GitRepo] Branch: ${config.branchName}`)

    // Initialize if configured to do so
    if (config.autoInit) {
      yield* initializeRepo()
    }

    function initializeRepo(): Effect.Effect<void, GitRepoError> {
      return Effect.gen(function* () {
        // Ensure main repository directory exists
        yield* Effect.tryPromise({
          try: () => fs.mkdir(config.repoPath, { recursive: true }),
          catch: (error) => new GitRepoError(`Failed to create repository directory: ${error}`)
        })

        // Check if repo is initialized
        const isRepo = yield* Effect.tryPromise({
          try: () => mainGit.checkIsRepo(),
          catch: (error) => new GitRepoError(`Failed to check repository status: ${error}`)
        })

        if (!isRepo) {
          yield* Effect.tryPromise({
            try: () => mainGit.init(),
            catch: (error) => new GitRepoError(`Failed to initialize repository: ${error}`)
          })

          yield* Effect.logInfo(`[GitRepo] Initialized Git repository at: ${config.repoPath}`)
        }

        if (useWorktree) {
          // Create the worktree
          yield* createWorktree()
        } else {
          // Work directly in the repo - create/checkout the branch
          yield* setupBranch()
        }

        yield* Ref.update(state, (s) => ({ ...s, isInitialized: true }))
      })
    }

    function createWorktree(): Effect.Effect<void, GitRepoError> {
      return Effect.gen(function* () {
        // Ensure worktrees directory exists
        const worktreesDir = path.dirname(workingPath)
        yield* Effect.tryPromise({
          try: () => fs.mkdir(worktreesDir, { recursive: true }),
          catch: (error) => new GitRepoError(`Failed to create worktrees directory: ${error}`)
        })

        // Check if worktree directory already exists
        const worktreeExists = yield* Effect.tryPromise({
          try: async () => {
            try {
              await fs.access(workingPath)
              return true
            } catch {
              return false
            }
          },
          catch: (error) => new GitRepoError(`Failed to check worktree directory: ${error}`)
        })

        if (worktreeExists) {
          yield* Effect.logInfo(`[GitRepo] Worktree directory already exists: ${workingPath}`)
          yield* Ref.update(state, (s) => ({ ...s, worktreeCreated: true }))
          return
        }

        // Create the worktree with the specified branch
        yield* Effect.tryPromise({
          try: () => mainGit.raw(['worktree', 'add', workingPath, '-b', config.branchName]),
          catch: (error) => new GitRepoError(`Failed to create worktree: ${error}`)
        })

        yield* Effect.logInfo(
          `[GitRepo] Created worktree at: ${workingPath} (branch: ${config.branchName})`
        )
        yield* Ref.update(state, (s) => ({ ...s, worktreeCreated: true }))
      })
    }

    function setupBranch(): Effect.Effect<void, GitRepoError> {
      return Effect.gen(function* () {
        // Check if branch already exists
        const branches = yield* Effect.tryPromise({
          try: () => mainGit.branch(['--list', config.branchName]),
          catch: (error) => new GitRepoError(`Failed to list branches: ${error}`)
        })

        if (branches.all.includes(config.branchName)) {
          // Branch exists, just checkout
          yield* Effect.tryPromise({
            try: () => mainGit.checkout(config.branchName),
            catch: (error) => new GitRepoError(`Failed to checkout branch: ${error}`)
          })
          yield* Effect.logInfo(`[GitRepo] Checked out existing branch: ${config.branchName}`)
        } else {
          // Create and checkout new branch
          yield* Effect.tryPromise({
            try: () => mainGit.checkoutLocalBranch(config.branchName),
            catch: (error) => new GitRepoError(`Failed to create branch: ${error}`)
          })
          yield* Effect.logInfo(
            `[GitRepo] Created and checked out new branch: ${config.branchName}`
          )
        }
      })
    }

    const init = () => initializeRepo()

    // All operations work on the working path (either repo or worktree)
    const status = () =>
      Effect.tryPromise({
        try: () => workingGit.status(),
        catch: (error) => new GitRepoError(`Failed to get repository status: ${error}`)
      })

    const diff = (options?: string[]) =>
      Effect.tryPromise({
        try: () => workingGit.diff(options || []),
        catch: (error) => new GitRepoError(`Failed to get diff: ${error}`)
      })

    const diffStaged = () =>
      Effect.tryPromise({
        try: () => workingGit.diff({ '--staged': null }),
        catch: (error) => new GitRepoError(`Failed to get staged diff: ${error}`)
      })

    const gitDiffIncludingUntracked = () =>
      Effect.tryPromise({
        try: async () => {
          // Get the normal diff for tracked files
          const trackedDiff = await workingGit.diff()

          // Get status to find untracked files
          const status = await workingGit.status()
          const untrackedFiles = status.not_added || []

          // Get diff for each untracked file using --no-index
          const untrackedDiffs = await Promise.all(
            untrackedFiles.map(async (file) => {
              try {
                const diff = await workingGit.diff(['--no-index', '/dev/null', file])
                return diff
              } catch {
                // Ignore errors for files that might have been deleted/moved
                return ''
              }
            })
          )

          // Combine all diffs into one string
          return [trackedDiff, ...untrackedDiffs].filter(Boolean).join('\n')
        },
        catch: (error) => new GitRepoError(`Failed to get complete diff: ${error}`)
      })

    const diffSummary = (options?: string[]) =>
      Effect.tryPromise({
        try: () => workingGit.diffSummary(options || []),
        catch: (error) => new GitRepoError(`Failed to get diff summary: ${error}`)
      })

    const commit = (message: string, files?: string[]) =>
      Effect.tryPromise({
        try: () => (files ? workingGit.commit(message, files) : workingGit.commit(message)),
        catch: (error) => new GitRepoError(`Failed to commit: ${error}`)
      }).pipe(Effect.asVoid)

    const add = (files: string | string[]) =>
      Effect.tryPromise({
        try: () => workingGit.add(files),
        catch: (error) => new GitRepoError(`Failed to add files: ${error}`)
      }).pipe(Effect.asVoid)

    const checkout = (branch: string) =>
      Effect.tryPromise({
        try: () => workingGit.checkout(branch),
        catch: (error) => new GitRepoError(`Failed to checkout branch: ${error}`)
      }).pipe(Effect.asVoid)

    const createBranch = (branchName: string, startPoint?: string) =>
      Effect.tryPromise({
        try: () =>
          startPoint
            ? workingGit.checkoutBranch(branchName, startPoint)
            : workingGit.checkoutLocalBranch(branchName),
        catch: (error) => new GitRepoError(`Failed to create branch: ${error}`)
      }).pipe(Effect.asVoid)

    const getState = () => Ref.get(state)

    // Cleanup function
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[GitRepo] Cleaning up Git repository resources')

        const currentState = yield* Ref.get(state)

        if (currentState.useWorktree && currentState.worktreeCreated) {
          yield* Effect.logInfo(`[GitRepo] Removing worktree: ${workingPath}`)

          // Remove the worktree
          yield* Effect.tryPromise({
            try: () => mainGit.raw(['worktree', 'remove', workingPath, '--force']),
            catch: (error) => new GitRepoError(`Failed to remove worktree: ${error}`)
          }).pipe(
            Effect.catchAll((error) =>
              Effect.logError(`[GitRepo] Failed to cleanup worktree: ${error.message}`)
            )
          )
        }

        yield* Effect.logInfo('[GitRepo] Git repository cleanup complete')
      })
    )

    return {
      git: workingGit,
      config,
      state,
      init,
      status,
      diff,
      diffStaged,
      gitDiffIncludingUntracked,
      diffSummary,
      commit,
      add,
      checkout,
      createBranch,
      getState
    }
  })

export const GitRepoLive = (config: GitRepoConfig) => Layer.scoped(GitRepoTag, makeGitRepo(config))
