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
  Context
} from 'effect'
import { query, type SDKMessage } from '@anthropic-ai/claude-code'
import {
  ClaudeCodeConfig,
  ClaudeCodeError,
  defaultClaudeCodeConfig
} from '../../types/claude-code.types.js'
import log from 'electron-log'

export type AgentStatus = 'idle' | 'running' | 'finished' | 'error' | 'cancelled'

export interface ClaudeCodeAgentState {
  status: AgentStatus
  messages: SDKMessage[]
  error: string | null
}

const initialState: ClaudeCodeAgentState = {
  status: 'idle',
  messages: [],
  error: null
}

export interface ClaudeCodeAgent {
  readonly state: SubscriptionRef.SubscriptionRef<ClaudeCodeAgentState>
  readonly changes: Stream.Stream<ClaudeCodeAgentState>
  readonly messages: Stream.Stream<SDKMessage>
  readonly run: (prompt: string) => Effect.Effect<void, ClaudeCodeError>
  readonly cancel: () => Effect.Effect<void>
}

export class ClaudeCodeAgentTag extends Context.Tag('ClaudeCodeAgent')<
  ClaudeCodeAgentTag,
  ClaudeCodeAgent
>() {}

export const makeClaudeCodeAgent = (
  initialConfig: Partial<ClaudeCodeConfig>
): Effect.Effect<ClaudeCodeAgent, never, Scope.Scope> =>
  Effect.gen(function* () {
    const config = { ...defaultClaudeCodeConfig, ...initialConfig }
    const state = yield* SubscriptionRef.make(initialState)
    const messagesPubSub = yield* PubSub.unbounded<SDKMessage>()
    const abortControllerRef = yield* Ref.make<AbortController | null>(null)

    yield* Effect.logInfo(`[ClaudeCodeAgent] Creating agent with config: ${JSON.stringify(config)}`)

    const run = (prompt: string) =>
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
            pathToClaudeCodeExecutable: config.pathToClaudeCodeExecutable
          }
        }

        log.info('[ClaudeCodeAgent] Starting query with options:', queryOptions.options)

        // Create a stream from the async iterable with proper error handling
        const queryStream = Stream.fromAsyncIterable(
          query(queryOptions) as AsyncIterable<SDKMessage>,
          (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error('[ClaudeCodeAgent] Stream error:', error)
            return new ClaudeCodeError(`Stream error: ${errorMessage}`)
          }
        )

        // Process each message through the stream pipeline
        const processStream = queryStream.pipe(
          Stream.tap((message: SDKMessage) =>
            PubSub.publish(messagesPubSub, message).pipe(
              Effect.zipRight(
                SubscriptionRef.update(state, (s) => ({
                  ...s,
                  messages: [...s.messages, message]
                }))
              )
            )
          ),
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
              yield* SubscriptionRef.update(state, (s) => ({
                ...s,
                status: 'error' as AgentStatus,
                error: prettyError
              }))
              log.error('[ClaudeCodeAgent] Agent run failed:', prettyError)
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
      cancel
    }
  })

export const ClaudeCodeAgentLive = (initialConfig: Partial<ClaudeCodeConfig>) =>
  Layer.scoped(ClaudeCodeAgentTag, makeClaudeCodeAgent(initialConfig))
