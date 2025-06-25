import { Effect } from 'effect'
import { DefaultLoggerLayer } from '../logger.js'
import { query, type SDKMessage } from '@anthropic-ai/claude-code'
import log from 'electron-log'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import which from 'which'

/**
 * Claude Code configuration
 */
export interface ClaudeCodeConfig {
  workingDirectory?: string
  maxTurns?: number
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  model?: string
  fallbackModel?: string
  pathToClaudeCodeExecutable?: string
}

/**
 * Errors that can be thrown by the Claude Code service
 */
export class ClaudeCodeServiceError extends Error {
  readonly _tag = 'ClaudeCodeServiceError'

  constructor(message: string) {
    super(message)
    this.name = 'ClaudeCodeServiceError'
  }
}

/**
 * ClaudeCodeService for running Claude Code commands and scripts
 */
export class ClaudeCodeService extends Effect.Service<ClaudeCodeService>()('ClaudeCodeService', {
  dependencies: [DefaultLoggerLayer],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('🤖 ClaudeCodeService started')
    log.info('[ClaudeCodeService] 🤖 Service initialized')

    // Default configuration with dedicated vibe-dir
    const vibeDir = path.join(os.homedir(), 'Documents', 'vibe-dir')
    const defaultConfig: ClaudeCodeConfig = {
      workingDirectory: vibeDir,
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      model: 'claude-3-5-sonnet-20241022',
      fallbackModel: 'claude-3-haiku-20240307'
    }

    // Detailed environment and executable debugging
    yield* Effect.gen(function* () {
      log.info('[ClaudeCodeService] 🤖 === ENVIRONMENT DEBUG INFO ===')
      log.info('[ClaudeCodeService] 🤖 Node.js version:', process.version)
      log.info('[ClaudeCodeService] 🤖 Platform:', process.platform)
      log.info('[ClaudeCodeService] 🤖 Architecture:', process.arch)
      log.info('[ClaudeCodeService] 🤖 Process executable path:', process.execPath)
      log.info('[ClaudeCodeService] 🤖 Current working directory:', process.cwd())
      log.info(
        '[ClaudeCodeService] 🤖 App is packaged:',
        !!(process.argv[0] && process.argv[0].includes('app.asar'))
      )

      // Check PATH environment variable
      const pathEnv = process.env.PATH || ''
      log.info('[ClaudeCodeService] 🤖 PATH length:', pathEnv.length)
      log.info('[ClaudeCodeService] 🤖 PATH directories count:', pathEnv.split(':').length)
      log.info('[ClaudeCodeService] 🤖 First 5 PATH directories:', pathEnv.split(':').slice(0, 5))

      // Check for common claude locations
      const commonPaths = [
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        path.join(os.homedir(), '.local/bin/claude'),
        path.join(os.homedir(), 'bin/claude')
      ]

      for (const claudePath of commonPaths) {
        try {
          const stats = fs.statSync(claudePath)
          if (stats.isFile()) {
            log.info(`[ClaudeCodeService] 🤖 Found claude executable at: ${claudePath}`)
            log.info(`[ClaudeCodeService] 🤖 Executable stats:`, {
              size: stats.size,
              mode: stats.mode.toString(8),
              isExecutable: !!(stats.mode & 0o111)
            })
          }
        } catch (error) {
          log.debug(`[ClaudeCodeService] 🤖 Claude not found at: ${claudePath}`)
        }
      }

      // Use node-which to find claude in PATH
      yield* Effect.tryPromise({
        try: async () => {
          try {
            const claudePath = await which('claude', { nothrow: true })
            if (claudePath) {
              log.info(`[ClaudeCodeService] 🤖 'which claude' found: ${claudePath}`)

              // Get additional info about the found executable
              try {
                const stats = fs.statSync(claudePath)
                log.info(`[ClaudeCodeService] 🤖 Claude executable info:`, {
                  path: claudePath,
                  size: stats.size,
                  mode: stats.mode.toString(8),
                  isExecutable: !!(stats.mode & 0o111),
                  mtime: stats.mtime
                })
              } catch (statError) {
                log.warn(`[ClaudeCodeService] 🤖 Could not stat claude executable: ${statError}`)
              }
            } else {
              log.info(`[ClaudeCodeService] 🤖 'which claude' returned null - not found in PATH`)
            }
          } catch (whichError) {
            log.info(`[ClaudeCodeService] 🤖 'which claude' error: ${whichError}`)
          }
        },
        catch: (error) => {
          log.debug(`[ClaudeCodeService] 🤖 'which' command failed: ${error}`)
          return void 0
        }
      })

      log.info('[ClaudeCodeService] 🤖 === END ENVIRONMENT DEBUG ===')
    })

    // Ensure vibe-dir exists
    yield* Effect.tryPromise({
      try: async () => {
        if (!fs.existsSync(vibeDir)) {
          log.info('[ClaudeCodeService] 🤖 Creating vibe-dir at:', vibeDir)
          await fs.promises.mkdir(vibeDir, { recursive: true })
          log.info('[ClaudeCodeService] 🤖 vibe-dir created successfully')
        } else {
          log.info('[ClaudeCodeService] 🤖 vibe-dir already exists at:', vibeDir)
        }
      },
      catch: (error) => {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.error('[ClaudeCodeService] 🤖 Failed to create vibe-dir:', errorMessage)
        return new ClaudeCodeServiceError(`Failed to create vibe-dir: ${errorMessage}`)
      }
    })

    yield* Effect.logInfo('🤖 vibe-dir setup completed', vibeDir)

    let currentConfig: ClaudeCodeConfig = { ...defaultConfig }

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Cleaning up ClaudeCodeService resources')
        log.info('[ClaudeCodeService] 🤖 Service cleanup completed')
      })
    )

    /**
     * Update the service configuration
     */
    const updateConfig = (config: Partial<ClaudeCodeConfig>) =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Updating ClaudeCodeService configuration', config)
        log.info('[ClaudeCodeService] 🤖 Updating configuration:', config)

        currentConfig = { ...currentConfig, ...config }

        yield* Effect.logInfo('🤖 Configuration updated successfully')
        log.info('[ClaudeCodeService] 🤖 New configuration:', currentConfig)
      })

    /**
     * Execute a Claude Code query with comprehensive logging
     */
    const executeQuery = (prompt: string, options?: Partial<ClaudeCodeConfig>) =>
      Effect.gen(function* () {
        const queryConfig = { ...currentConfig, ...options }

        yield* Effect.logInfo('🤖 Starting Claude Code query', {
          prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
          config: queryConfig
        })
        log.info('[ClaudeCodeService] 🤖 Starting query with prompt:', prompt.substring(0, 100))
        log.info('[ClaudeCodeService] 🤖 Query configuration:', queryConfig)

        // Enhanced pre-execution logging
        log.info('[ClaudeCodeService] 🤖 === PRE-EXECUTION DEBUG ===')
        log.info(
          '[ClaudeCodeService] 🤖 Working directory exists:',
          fs.existsSync(queryConfig.workingDirectory || '')
        )
        log.info(
          '[ClaudeCodeService] 🤖 Working directory permissions:',
          (() => {
            try {
              const stats = fs.statSync(queryConfig.workingDirectory || '')
              return {
                readable: !!(stats.mode & 0o444),
                writable: !!(stats.mode & 0o222),
                executable: !!(stats.mode & 0o111)
              }
            } catch {
              return 'unable to check'
            }
          })()
        )

        if (queryConfig.pathToClaudeCodeExecutable) {
          log.info(
            '[ClaudeCodeService] 🤖 Custom executable path specified:',
            queryConfig.pathToClaudeCodeExecutable
          )
          log.info(
            '[ClaudeCodeService] 🤖 Custom executable exists:',
            fs.existsSync(queryConfig.pathToClaudeCodeExecutable)
          )
        } else {
          log.info(
            '[ClaudeCodeService] 🤖 No custom executable path specified, will use system PATH'
          )
        }
        log.info('[ClaudeCodeService] 🤖 === END PRE-EXECUTION DEBUG ===')

        return yield* Effect.tryPromise({
          try: async () => {
            const messages: SDKMessage[] = []
            const abortController = new AbortController()
            let messageCount = 0

            log.info(
              '[ClaudeCodeService] 🤖 Beginning execution with working directory:',
              queryConfig.workingDirectory
            )

            try {
              for await (const message of query({
                prompt,
                abortController,
                options: {
                  cwd: queryConfig.workingDirectory,
                  maxTurns: queryConfig.maxTurns,
                  permissionMode: queryConfig.permissionMode,
                  model: queryConfig.model,
                  fallbackModel: queryConfig.fallbackModel,
                  pathToClaudeCodeExecutable: queryConfig.pathToClaudeCodeExecutable
                }
              })) {
                messageCount++
                messages.push(message)

                log.info(`[ClaudeCodeService] 🤖 Message ${messageCount} - Type: ${message.type}`)

                // Log detailed message information based on type
                switch (message.type) {
                  case 'system':
                    log.info('[ClaudeCodeService] 🤖 System message:', {
                      subtype: message.subtype,
                      cwd: message.cwd,
                      model: message.model,
                      tools: message.tools,
                      permissionMode: message.permissionMode,
                      mcp_servers: message.mcp_servers
                    })
                    break
                  case 'user':
                    log.info('[ClaudeCodeService] 🤖 User message received')
                    break
                  case 'assistant':
                    log.info('[ClaudeCodeService] 🤖 Assistant message received')
                    break
                  case 'result':
                    if (message.subtype === 'success') {
                      log.info('[ClaudeCodeService] 🤖 Query completed successfully:', {
                        duration_ms: message.duration_ms,
                        num_turns: message.num_turns,
                        total_cost_usd: message.total_cost_usd,
                        result:
                          message.result.substring(0, 200) +
                          (message.result.length > 200 ? '...' : '')
                      })
                    } else {
                      log.error('[ClaudeCodeService] 🤖 Query failed:', {
                        subtype: message.subtype,
                        duration_ms: message.duration_ms,
                        num_turns: message.num_turns,
                        total_cost_usd: message.total_cost_usd
                      })
                    }
                    break
                }
              }
            } catch (iteratorError) {
              // Enhanced error logging for iterator failures
              log.error('[ClaudeCodeService] 🤖 Iterator error details:', {
                error: iteratorError,
                errorMessage:
                  iteratorError instanceof Error ? iteratorError.message : String(iteratorError),
                errorStack: iteratorError instanceof Error ? iteratorError.stack : 'No stack trace',
                errorName:
                  iteratorError instanceof Error ? iteratorError.name : 'Unknown error type'
              })
              throw iteratorError
            }

            log.info(
              `[ClaudeCodeService] 🤖 Query execution completed. Total messages: ${messageCount}`
            )

            return messages
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorStack = error instanceof Error ? error.stack : 'No stack trace available'
            const errorName = error instanceof Error ? error.name : 'Unknown error type'

            log.error('[ClaudeCodeService] 🤖 === DETAILED ERROR INFO ===')
            log.error('[ClaudeCodeService] 🤖 Error name:', errorName)
            log.error('[ClaudeCodeService] 🤖 Error message:', errorMessage)
            log.error('[ClaudeCodeService] 🤖 Error stack:', errorStack)
            log.error('[ClaudeCodeService] 🤖 Error object:', error)
            log.error('[ClaudeCodeService] 🤖 === END ERROR INFO ===')

            return new ClaudeCodeServiceError(`Query failed: ${errorMessage}`)
          }
        })
      })

    /**
     * Execute a simple script creation task
     */
    const createSimpleScript = (description: string, filename?: string) =>
      Effect.gen(function* () {
        const scriptFilename = filename || 'generated-script.ts'
        const prompt = `Create a simple TypeScript script called "${scriptFilename}" that ${description}. 
        
        Please:
        1. Make sure the script is well-commented
        2. Include proper error handling
        3. Add console.log statements for debugging
        4. Make it executable with node/ts-node
        
        The script should be saved in the current working directory.`

        yield* Effect.logInfo('🤖 Creating simple script', {
          description,
          filename: scriptFilename
        })
        log.info('[ClaudeCodeService] 🤖 Creating script:', description)

        return yield* executeQuery(prompt)
      })

    /**
     * Get the current configuration
     */
    const getConfig = () =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Getting current configuration')
        log.info('[ClaudeCodeService] 🤖 Current config requested:', currentConfig)
        return currentConfig
      })

    /**
     * Test the service with a simple command
     */
    const testService = () =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Testing ClaudeCodeService')
        log.info('[ClaudeCodeService] 🤖 Running service test')

        const testPrompt =
          "Create a simple 'hello world' TypeScript file that prints the current date and time"

        return yield* executeQuery(testPrompt, {
          maxTurns: 2
        })
      })

    /**
     * Detect and configure the Claude executable path
     */
    const detectAndConfigureClaudeExecutable = () =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Detecting Claude executable path')
        log.info('[ClaudeCodeService] 🤖 Starting Claude executable detection')

        return yield* Effect.tryPromise({
          try: async () => {
            // First, try to find claude using node-which
            const claudePath = await which('claude', { nothrow: true })

            if (claudePath) {
              log.info(`[ClaudeCodeService] 🤖 Found claude at: ${claudePath}`)

              // Verify it's executable
              try {
                const stats = fs.statSync(claudePath)
                if (stats.isFile() && !!(stats.mode & 0o111)) {
                  log.info(`[ClaudeCodeService] 🤖 Claude executable verified: ${claudePath}`)

                  // Update configuration with the found path
                  currentConfig = {
                    ...currentConfig,
                    pathToClaudeCodeExecutable: claudePath
                  }

                  log.info(
                    `[ClaudeCodeService] 🤖 Configuration updated with Claude path: ${claudePath}`
                  )
                  return claudePath
                } else {
                  log.warn(
                    `[ClaudeCodeService] 🤖 Found claude but it's not executable: ${claudePath}`
                  )
                  return null
                }
              } catch (error) {
                log.error(`[ClaudeCodeService] 🤖 Error checking claude executable: ${error}`)
                return null
              }
            } else {
              log.info(`[ClaudeCodeService] 🤖 Claude not found in PATH`)

              // Try common installation paths
              const commonPaths = [
                '/usr/local/bin/claude',
                '/opt/homebrew/bin/claude',
                path.join(os.homedir(), '.local/bin/claude'),
                path.join(os.homedir(), 'bin/claude'),
                path.join(os.homedir(), '.local/share/anthropic/claude-code/bin/claude')
              ]

              for (const claudePath of commonPaths) {
                try {
                  const stats = fs.statSync(claudePath)
                  if (stats.isFile() && !!(stats.mode & 0o111)) {
                    log.info(`[ClaudeCodeService] 🤖 Found claude at common path: ${claudePath}`)

                    // Update configuration with the found path
                    currentConfig = {
                      ...currentConfig,
                      pathToClaudeCodeExecutable: claudePath
                    }

                    log.info(
                      `[ClaudeCodeService] 🤖 Configuration updated with Claude path: ${claudePath}`
                    )
                    return claudePath
                  }
                } catch (error) {
                  // Path doesn't exist, continue checking
                  continue
                }
              }

              log.warn(
                `[ClaudeCodeService] 🤖 Could not find claude executable in any common paths`
              )
              return null
            }
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error(
              `[ClaudeCodeService] 🤖 Error during Claude executable detection: ${errorMessage}`
            )
            return new ClaudeCodeServiceError(`Failed to detect Claude executable: ${errorMessage}`)
          }
        })
      })

    /**
     * Get detailed system information for debugging
     */
    const getSystemInfo = () =>
      Effect.gen(function* () {
        yield* Effect.logInfo('🤖 Gathering system information')

        return yield* Effect.tryPromise({
          try: async () => {
            const info = {
              nodejs: process.version,
              platform: process.platform,
              arch: process.arch,
              execPath: process.execPath,
              cwd: process.cwd(),
              isPackaged: !!(process.argv[0] && process.argv[0].includes('app.asar')),
              pathEnv: process.env.PATH || '',
              claudeExecutable: currentConfig.pathToClaudeCodeExecutable || 'not configured'
            }

            log.info('[ClaudeCodeService] 🤖 System info collected:', info)
            return info
          },
          catch: (error) => {
            const errorMessage = error instanceof Error ? error.message : String(error)
            log.error(`[ClaudeCodeService] 🤖 Error gathering system info: ${errorMessage}`)
            return new ClaudeCodeServiceError(`Failed to gather system info: ${errorMessage}`)
          }
        })
      })

    // Return the service API
    return {
      executeQuery,
      createSimpleScript,
      updateConfig,
      getConfig,
      testService,
      detectAndConfigureClaudeExecutable,
      getSystemInfo
    }
  })
}) {}

/**
 * Live layer for ClaudeCodeService
 */
export const ClaudeCodeServiceLive = ClaudeCodeService.Default
