import {
  Effect,
  SubscriptionRef,
  Stream,
  Scope,
  PubSub,
  Ref,
  Cause,
  Exit,
  Layer,
  Context,
  Option,
  Chunk
} from 'effect'
import { query, type SDKMessage, type SDKSystemMessage } from '@anthropic-ai/claude-code'
import { SdkMessage } from '@slide.code/schema'
import {
  ClaudeCodeConfig,
  ClaudeCodeError,
  defaultClaudeCodeConfig
} from '../../types/claude-code.types.js'
import log from 'electron-log'
import { ensureDirectory } from '../../utils/filesystem.util.js'
import * as path from 'node:path'

export type AgentStatus = 'idle' | 'running' | 'finished' | 'error' | 'cancelled'

export interface ClaudeCodeAgentState {
  status: AgentStatus
  messages: SdkMessage[]
  error: string | null
}

const initialState: ClaudeCodeAgentState = {
  status: 'idle',
  messages: [],
  error: null
}

/**
 * Convert SDKMessage from the Claude Code SDK to our internal SdkMessage schema type
 */
const convertSDKMessageToSchemaMessage = (sdkMessage: SDKMessage): SdkMessage => {
  // The types are structurally compatible, so we can cast directly
  // This ensures type safety at the boundary between SDK and our schema
  return sdkMessage as SdkMessage
}

export interface ClaudeCodeAgent {
  readonly state: SubscriptionRef.SubscriptionRef<ClaudeCodeAgentState>
  readonly changes: Stream.Stream<ClaudeCodeAgentState>
  readonly messages: Stream.Stream<SdkMessage>
  readonly run: (prompt: string, sessionId?: string) => Effect.Effect<void, ClaudeCodeError>
  readonly cancel: () => Effect.Effect<void>
  readonly checkAuth: () => Effect.Effect<boolean, ClaudeCodeError>
}

export class ClaudeCodeAgentTag extends Context.Tag('ClaudeCodeAgent')<
  ClaudeCodeAgentTag,
  ClaudeCodeAgent
>() {}

export const makeClaudeCodeAgent = (
  initialConfig: Partial<ClaudeCodeConfig>
): Effect.Effect<ClaudeCodeAgent, never, Scope.Scope> =>
  Effect.gen(function* () {
    yield* Effect.logInfo('[ClaudeCodeAgent] Starting makeClaudeCodeAgent')

    const config = { ...defaultClaudeCodeConfig, ...initialConfig }

    yield* Effect.logInfo(`[ClaudeCodeAgent] Creating agent with config: ${JSON.stringify(config)}`)

    // Validate required configuration
    if (!config.workingDirectory) {
      return yield* Effect.die(new Error('workingDirectory is required'))
    }

    if (!config.pathToClaudeCodeExecutable) {
      return yield* Effect.die(new Error('pathToClaudeCodeExecutable is required'))
    }

    yield* Effect.logInfo('[ClaudeCodeAgent] Configuration validated, creating resources')

    const state = yield* SubscriptionRef.make(initialState)
    const messagesPubSub = yield* PubSub.unbounded<SdkMessage>()
    const abortControllerRef = yield* Ref.make<AbortController | null>(null)

    yield* Effect.logInfo('[ClaudeCodeAgent] Resources created successfully')

    const run = (prompt: string, sessionId?: string) =>
      Effect.gen(function* () {
        const currentStatus = yield* SubscriptionRef.get(state).pipe(Effect.map((s) => s.status))
        if (currentStatus === 'running') {
          return yield* Effect.fail(new ClaudeCodeError('Agent is already running'))
        }

        yield* SubscriptionRef.set(state, { ...initialState, status: 'running' as AgentStatus })

        const abortController = new AbortController()
        yield* Ref.set(abortControllerRef, abortController)

        const queryOptions = {
          prompt,
          abortController,
          options: {
            cwd: config.workingDirectory,
            maxTurns: config.maxTurns,
            permissionMode: config.permissionMode,
            model: config.model,
            fallbackModel: config.fallbackModel,
            pathToClaudeCodeExecutable: config.pathToClaudeCodeExecutable,
            // Add session continuation support
            ...(sessionId && { resume: sessionId })
          }
        }

        log.info('[ClaudeCodeAgent] Starting query with options:', queryOptions.options)

        // Wrap the query execution to catch any unhandled promise rejections
        const queryIterable = (() => {
          try {
            return query(queryOptions) as AsyncIterable<SDKMessage>
          } catch (error) {
            log.error('[ClaudeCodeAgent] Query execution error:', error)
            throw error
          }
        })()

        // Create a stream from the async iterable with proper error handling
        const queryStream = Stream.fromAsyncIterable(queryIterable, (error) => {
          const errorMessage = error instanceof Error ? error.message : String(error)
          log.error('[ClaudeCodeAgent] Stream error:', error)

          // Handle process termination gracefully (exit code 143 = SIGTERM)
          if (errorMessage.includes('exited with code 143')) {
            log.info('[ClaudeCodeAgent] Process terminated via SIGTERM (expected for cancellation)')
            return new ClaudeCodeError('Process cancelled')
          }

          return new ClaudeCodeError(`Stream error: ${errorMessage}`)
        })

        // Process each message through the stream pipeline
        const processStream = queryStream.pipe(
          Stream.tap((sdkMessage: SDKMessage) => {
            // Convert SDK message to our schema message
            const schemaMessage = convertSDKMessageToSchemaMessage(sdkMessage)
            console.log(
              '[ClaudeCodeAgent] 🔧 Converted SDK message to schema message:',
              schemaMessage
            )
            return PubSub.publish(messagesPubSub, schemaMessage).pipe(
              Effect.zipRight(
                SubscriptionRef.update(state, (s) => ({
                  ...s,
                  messages: [...s.messages, schemaMessage]
                }))
              )
            )
          }),
          Stream.runDrain
        )

        // The stream processing already includes error handling from fromAsyncIterable
        const queryEffect = processStream

        const finalizer = (exit: Exit.Exit<void, ClaudeCodeError>) =>
          Effect.gen(function* () {
            if (Exit.isSuccess(exit)) {
              yield* SubscriptionRef.update(state, (s) => ({
                ...s,
                status: 'finished' as AgentStatus
              }))
              log.info('[ClaudeCodeAgent] Agent run finished successfully.')
            } else {
              const prettyError = Cause.pretty(exit.cause)

              // Check if this was a cancellation (process terminated)
              if (
                prettyError.includes('Process cancelled') ||
                prettyError.includes('exited with code 143')
              ) {
                yield* SubscriptionRef.update(state, (s) => ({
                  ...s,
                  status: 'cancelled' as AgentStatus
                }))
                log.info('[ClaudeCodeAgent] Agent run was cancelled.')
              } else {
                yield* SubscriptionRef.update(state, (s) => ({
                  ...s,
                  status: 'error' as AgentStatus,
                  error: prettyError
                }))
                log.error('[ClaudeCodeAgent] Agent run failed:', prettyError)
              }
            }
            yield* Ref.set(abortControllerRef, null)
          })

        // Fork the execution so we can return immediately
        yield* Effect.fork(Effect.onExit(queryEffect, finalizer))
      }).pipe(Effect.scoped)

    const cancel = () =>
      Effect.gen(function* () {
        const abortController = yield* Ref.get(abortControllerRef)
        if (abortController) {
          log.info('[ClaudeCodeAgent] Cancelling agent run.')
          abortController.abort()
          yield* Ref.set(abortControllerRef, null)
          yield* SubscriptionRef.update(state, (s) => ({
            ...s,
            status: 'cancelled' as AgentStatus
          }))
        }
      })

    const checkAuth = (): Effect.Effect<boolean, ClaudeCodeError> =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[ClaudeCodeAgent] Checking auth status.')

        if (!config.workingDirectory) {
          return yield* Effect.fail(
            new ClaudeCodeError('workingDirectory is required for auth check')
          )
        }

        const authCheckDir = path.join(config.workingDirectory, '.authCheck')
        yield* ensureDirectory(authCheckDir)

        // Create a temporary agent with the auth check directory
        const authAgent = yield* makeClaudeCodeAgent({
          ...config,
          workingDirectory: authCheckDir,
          maxTurns: 3,
          permissionMode: 'bypassPermissions'
        })

        // Set up a promise to capture the system message
        let authResult = true // Assume authenticated until we see an error

        // Subscribe to messages and look for authentication errors
        const messageSubscription = authAgent.messages.pipe(
          Stream.tap((message: SdkMessage) =>
            Effect.gen(function* () {
              // Check for assistant messages with "Invalid API key" error
              if (message.type === 'assistant') {
                const assistantMessage = message.message
                if (assistantMessage && assistantMessage.content) {
                  const content = Array.isArray(assistantMessage.content)
                    ? assistantMessage.content
                    : [assistantMessage.content]

                  const hasAuthError = content.some((block) => {
                    if (block && typeof block === 'object' && 'type' in block && 'text' in block) {
                      const hasError =
                        block.type === 'text' &&
                        typeof block.text === 'string' &&
                        block.text.includes('Invalid API key')
                      if (hasError) {
                        console.log('[ClaudeCodeAgent] Found Invalid API key in text:', block.text)
                      }
                      return hasError
                    }
                    return false
                  })

                  if (hasAuthError) {
                    log.warn(
                      '[ClaudeCodeAgent] Auth check failed: Invalid API key detected in assistant message'
                    )
                    authResult = false
                  }
                }
              }

              // Also check result messages for auth errors
              if (message.type === 'result' && message.is_error) {
                if (message.result && message.result.includes('Invalid API key')) {
                  log.warn(
                    '[ClaudeCodeAgent] Auth check failed: Invalid API key detected in result message'
                  )
                  authResult = false
                }
              }
            })
          ),
          Stream.runDrain
        )

        // Start the message subscription
        yield* Effect.fork(messageSubscription)

        // Run a simple auth check prompt
        yield* authAgent.run('auth-check')

        // Wait for the agent to complete
        yield* authAgent.changes.pipe(
          Stream.filter(
            (s) => s.status === 'finished' || s.status === 'error' || s.status === 'cancelled'
          ),
          Stream.runHead
        )

        return authResult
      }).pipe(
        Effect.scoped,
        Effect.catchAll((error) => {
          log.error('[ClaudeCodeAgent] Auth check failed with error:', error)
          return Effect.succeed(false)
        })
      )

    const messages = Stream.fromPubSub(messagesPubSub)

    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        log.info('[ClaudeCodeAgent] Cleaning up agent resources.')
        yield* cancel()
        yield* PubSub.shutdown(messagesPubSub)
      })
    )

    return {
      state,
      changes: state.changes,
      messages,
      run,
      cancel,
      checkAuth
    }
  })

export const ClaudeCodeAgentLive = (initialConfig: Partial<ClaudeCodeConfig>) =>
  Layer.scoped(ClaudeCodeAgentTag, makeClaudeCodeAgent(initialConfig))
