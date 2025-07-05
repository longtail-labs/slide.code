import { Effect, Duration } from 'effect'
import log from 'electron-log'
import { UserRef } from '../refs/ipc/user.ref.js'
import { findClaudeCodeExecutable } from './findClaudeCodeExecutable.effect.js'
import { makeClaudeCodeAgent } from '../resources/ClaudeCodeAgent/claude-code-agent.resource.js'

/**
 * Check Claude Code authentication status
 * Only checks if not already authenticated
 */
export const checkClaudeCodeAuth = Effect.gen(function* () {
  yield* Effect.logInfo('🤖 Starting Claude Code auth check')
  log.info('[EFFECT] 🤖 Starting Claude Code auth check')

  const userRef = yield* UserRef
  const userState = yield* userRef.ref.get()

  // If already authenticated, skip the check
  if (userState.claudeCode?.isAuthenticated === true) {
    yield* Effect.logInfo('🤖 Claude Code already authenticated, skipping check')
    log.info('[EFFECT] 🤖 Claude Code already authenticated, skipping check')
    return { checked: false, reason: 'already-authenticated', isAuthenticated: true }
  }

  // Get executable path - try to detect if not available
  let executablePath = userState.claudeCode?.executablePath

  if (!executablePath) {
    yield* Effect.logInfo('🤖 No Claude executable path found, attempting detection')
    log.info('[EFFECT] 🤖 No Claude executable path found, attempting detection')

    const detectedPath = yield* findClaudeCodeExecutable.pipe(
      Effect.catchAll((error) => {
        log.warn('[EFFECT] ⚠️ Claude executable detection failed:', error)
        return Effect.succeed(null)
      })
    )

    if (detectedPath) {
      executablePath = detectedPath
      yield* userRef.updateClaudeCodeExecutablePath(detectedPath)
      yield* Effect.logInfo(`🤖 Claude executable detected: ${detectedPath}`)
      log.info('[EFFECT] ✅ Claude executable detected and configured:', detectedPath)
    } else {
      yield* Effect.logWarning('🤖 Could not detect Claude executable')
      log.warn('[EFFECT] ⚠️ Could not detect Claude executable')

      // Update user state to reflect the failed check
      yield* userRef.ref.update((state) => ({
        ...state,
        claudeCode: {
          ...(state.claudeCode ?? {
            executablePath: null,
            lastDetected: null,
            stats: { totalRequests: 0, totalCost: 0, lastUsed: null, lastSyncTime: null }
          }),
          isAuthenticated: false,
          lastAuthCheck: Date.now()
        }
      }))

      return { checked: true, reason: 'no-executable', isAuthenticated: false }
    }
  }

  // Check auth status
  try {
    const claudeConfig = {
      workingDirectory: userState.vibeDirectory,
      pathToClaudeCodeExecutable: executablePath
    }

    const checkEffect = Effect.gen(function* () {
      const agent = yield* makeClaudeCodeAgent(claudeConfig)
      return yield* agent.checkAuth()
    })

    const isAuthenticated = yield* Effect.scoped(checkEffect).pipe(
      Effect.catchAll((error) => {
        log.error('[EFFECT] ❌ Claude Code auth check failed:', error)
        return Effect.succeed(false)
      })
    )

    const now = Date.now()

    // Update user state with auth status
    yield* userRef.ref.update((state) => ({
      ...state,
      claudeCode: {
        ...(state.claudeCode ?? {
          executablePath: null,
          lastDetected: null,
          stats: { totalRequests: 0, totalCost: 0, lastUsed: null, lastSyncTime: null }
        }),
        executablePath,
        isAuthenticated,
        lastDetected: executablePath ? now : (state.claudeCode?.lastDetected ?? null),
        lastAuthCheck: now
      }
    }))

    yield* Effect.logInfo(
      `🤖 Claude Code auth check completed: ${isAuthenticated ? 'authenticated' : 'not authenticated'}`
    )
    log.info('[EFFECT] ✅ Claude Code auth check completed:', {
      isAuthenticated,
      executablePath,
      workingDirectory: userState.vibeDirectory
    })

    return { checked: true, reason: 'check-completed', isAuthenticated }
  } catch (error) {
    yield* Effect.logError('🤖 Error during Claude Code auth check', error)
    log.error('[EFFECT] ❌ Claude Code auth check error:', error)

    // Update user state to reflect the failed check
    yield* userRef.ref.update((state) => ({
      ...state,
      claudeCode: {
        ...(state.claudeCode ?? {
          executablePath: null,
          lastDetected: null,
          stats: { totalRequests: 0, totalCost: 0, lastUsed: null, lastSyncTime: null }
        }),
        isAuthenticated: false,
        lastAuthCheck: Date.now()
      }
    }))

    return { checked: true, reason: 'error', isAuthenticated: false, error }
  }
})

/**
 * Initialize Claude Code auth checking - run once on app startup with a delay
 * Only checks if not already authenticated
 */
export const initializeClaudeCodeAuth = Effect.gen(function* () {
  yield* Effect.logInfo('🚀 Initializing Claude Code auth check')
  log.info('[EFFECT] 🚀 Initializing Claude Code auth check')

  // Wait a short delay to avoid blocking app startup
  yield* Effect.sleep(Duration.seconds(3))

  // Run auth check once
  const authCheck = yield* checkClaudeCodeAuth

  yield* Effect.logInfo('✅ Claude Code auth check completed')
  log.info('[EFFECT] ✅ Claude Code auth check completed:', authCheck.isAuthenticated)

  return authCheck
})
