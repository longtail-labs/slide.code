import { Effect } from 'effect'
import { IPCRefService } from '../../services/ipc-ref.service.js'
import {
  ClaudeStateSchema,
  type ClaudeState,
  type ClaudeCodeStats,
  type McpServerConfig,
  type TokenTotals,
  type DailyUsage,
  type SessionUsage
} from '@slide.code/schema'
import { ElectronStoreUtil } from '../../utils/electron-store.util.js'
import { CcusageService } from '../../services/ccusage.service.js'

/**
 * Initial state for the Claude ref
 */
export const initialClaudeState: ClaudeState = {
  executablePath: null,
  lastDetected: null,
  stats: {
    totalRequests: 0,
    totalCost: 0,
    lastUsed: null,
    lastSyncTime: null
  },
  isAuthenticated: false,
  lastAuthCheck: null,
  mcpServers: {
    context7: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      enabled: true
    }
  }
}

/**
 * Errors that can be thrown by the Claude ref
 */
export class ClaudeRefError extends Error {
  readonly _tag = 'ClaudeRefError'

  constructor(message: string) {
    super(message)
    this.name = 'ClaudeRefError'
  }
}

/**
 * ClaudeRef service for managing Claude Code configuration
 */
export class ClaudeRef extends Effect.Service<ClaudeRef>()('ClaudeRef', {
  dependencies: [IPCRefService.Default],
  scoped: Effect.gen(function* () {
    yield* Effect.logInfo('[ClaudeRef] 🤖 Creating ClaudeRef')

    // Get the IPCRefService and create the ref
    const refService = yield* IPCRefService

    // Check if we already have Claude data in storage
    const existingClaudeData = ElectronStoreUtil.get('claude-data')

    console.log('[ClaudeRef] existingClaudeData', existingClaudeData)

    // Initialize the Claude state
    let claudeState = initialClaudeState

    if (existingClaudeData) {
      try {
        yield* Effect.logInfo('[ClaudeRef] Using existing Claude data')
        claudeState = {
          ...initialClaudeState,
          ...(typeof existingClaudeData === 'object' && existingClaudeData !== null
            ? existingClaudeData
            : {})
        } as ClaudeState

        // Ensure stats has all required fields
        if (!claudeState.stats) {
          claudeState = {
            ...claudeState,
            stats: {
              totalRequests: 0,
              totalCost: 0,
              lastUsed: null,
              lastSyncTime: null
            }
          }
        }

        // Migrate existing data to include MCP servers if missing
        if (!claudeState.mcpServers) {
          yield* Effect.logInfo(
            '[ClaudeRef] Migrating existing Claude config to include MCP servers'
          )
          claudeState = {
            ...claudeState,
            mcpServers: {
              context7: {
                command: 'npx',
                args: ['-y', '@upstash/context7-mcp'],
                enabled: true
              }
            }
          }
        }
      } catch (error) {
        yield* Effect.logWarning(`[ClaudeRef] Error loading existing Claude data: ${error}`)
        // Will use initial state
      }
    }

    // Create the ref with persistence
    const ref = yield* refService.create('claude', claudeState, ClaudeStateSchema, {
      persist: true,
      key: 'claude-data'
    })

    /**
     * Update Claude Code executable path
     */
    const updateExecutablePath = (executablePath: string | null) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] updateExecutablePath', executablePath)
        yield* ref.update((state) => ({
          ...state,
          executablePath,
          lastDetected: executablePath ? Date.now() : null
        }))
        return true
      })

    /**
     * Update authentication status
     */
    const updateAuthStatus = (isAuthenticated: boolean) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] updateAuthStatus', isAuthenticated)
        yield* ref.update((state) => ({
          ...state,
          isAuthenticated,
          lastAuthCheck: Date.now()
        }))
        return true
      })

    /**
     * Update Claude Code usage stats
     */
    const updateStats = (stats: { requests?: number; cost?: number }) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] updateStats', stats)
        yield* ref.update((state) => ({
          ...state,
          stats: {
            totalRequests: state.stats.totalRequests + (stats.requests || 0),
            totalCost: state.stats.totalCost + (stats.cost || 0),
            lastUsed: Date.now(),
            lastSyncTime: state.stats.lastSyncTime,
            tokenTotals: state.stats.tokenTotals,
            dailyUsage: state.stats.dailyUsage,
            sessionUsage: state.stats.sessionUsage,
            modelsUsed: state.stats.modelsUsed
          }
        }))
        return true
      })

    /**
     * Update MCP server configuration
     */
    const updateMcpServers = (mcpServers: Record<string, McpServerConfig>) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] updateMcpServers', mcpServers)
        yield* ref.update((state) => ({
          ...state,
          mcpServers
        }))
        return true
      })

    /**
     * Add or update a single MCP server
     */
    const addMcpServer = (name: string, config: McpServerConfig) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] addMcpServer', name, config)
        yield* ref.update((state) => ({
          ...state,
          mcpServers: {
            ...state.mcpServers,
            [name]: config
          }
        }))
        return true
      })

    /**
     * Remove an MCP server
     */
    const removeMcpServer = (name: string) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] removeMcpServer', name)
        yield* ref.update((state) => {
          const mcpServers = { ...state.mcpServers }
          delete mcpServers[name]
          return {
            ...state,
            mcpServers
          }
        })
        return true
      })

    /**
     * Toggle MCP server enabled/disabled
     */
    const toggleMcpServer = (name: string, enabled: boolean) =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] toggleMcpServer', name, enabled)
        yield* ref.update((state) => {
          const currentServer = state.mcpServers?.[name]
          if (!currentServer) {
            return state
          }
          return {
            ...state,
            mcpServers: {
              ...state.mcpServers,
              [name]: {
                ...currentServer,
                enabled
              }
            }
          }
        })
        return true
      })

    /**
     * Get MCP servers configuration
     */
    const getMcpServers = Effect.gen(function* () {
      const state = yield* ref.get()
      return state.mcpServers || {}
    })

    /**
     * Sync Claude Code usage statistics from ccusage service
     */
    const syncUsageStats = () =>
      Effect.gen(function* () {
        console.log('[ClaudeRef] syncUsageStats')
        try {
          const ccusageService = yield* CcusageService
          const usageStats = yield* ccusageService.loadComprehensiveStats().pipe(
            Effect.catchAll((error) => {
              console.log('[ClaudeRef] No usage data available:', error.message)
              return Effect.succeed({
                dailyUsage: [],
                sessionUsage: [],
                tokenTotals: {
                  inputTokens: 0,
                  outputTokens: 0,
                  cacheCreationTokens: 0,
                  cacheReadTokens: 0,
                  totalTokens: 0,
                  totalCost: 0
                },
                modelsUsed: []
              })
            })
          )

          yield* ref.update((state) => ({
            ...state,
            stats: {
              ...state.stats,
              totalCost: usageStats.tokenTotals.totalCost,
              lastSyncTime: Date.now(),
              tokenTotals: usageStats.tokenTotals,
              modelsUsed: usageStats.modelsUsed,
              // Keep only recent data to avoid bloating the state
              dailyUsage: usageStats.dailyUsage.slice(-7), // Last 7 days
              sessionUsage: usageStats.sessionUsage.slice(-5) // Last 5 sessions
            }
          }))

          console.log('[ClaudeRef] ✅ Claude Code usage stats synced successfully')
          return true
        } catch (error) {
          console.error('[ClaudeRef] ❌ Failed to sync Claude Code usage stats:', error)
          return false
        }
      })

    // Register a finalizer for cleanup
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        yield* Effect.logInfo('[ClaudeRef] 🧹 Cleaning up ClaudeRef')
        yield* Effect.logInfo('[ClaudeRef] 🧹 ClaudeRef cleaned up successfully')
      })
    )

    // Return the service API
    return {
      ref,
      updateExecutablePath,
      updateAuthStatus,
      updateStats,
      updateMcpServers,
      addMcpServer,
      removeMcpServer,
      toggleMcpServer,
      getMcpServers,
      syncUsageStats
    }
  })
}) {}

/**
 * Live layer for ClaudeRef
 */
export const ClaudeRefLive = ClaudeRef.Default

/**
 * Get the Claude ref from the service
 */
export const getClaudeRef = Effect.gen(function* () {
  const claudeRef = yield* ClaudeRef
  return claudeRef.ref
})

/**
 * Get Claude Code configuration
 */
export const getClaudeConfig = Effect.gen(function* () {
  const claudeRef = yield* ClaudeRef
  const state = yield* claudeRef.ref.get()
  return state
})

/**
 * Update executable path (exposed for direct invocation)
 */
export const updateClaudeExecutablePath = (executablePath: string | null) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.updateExecutablePath(executablePath)
  })

/**
 * Update authentication status (exposed for direct invocation)
 */
export const updateClaudeAuthStatus = (isAuthenticated: boolean) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.updateAuthStatus(isAuthenticated)
  })

/**
 * Update Claude Code usage stats (exposed for direct invocation)
 */
export const updateClaudeStats = (stats: { requests?: number; cost?: number }) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.updateStats(stats)
  })

/**
 * Update MCP servers configuration (exposed for direct invocation)
 */
export const updateMcpServers = (mcpServers: Record<string, McpServerConfig>) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.updateMcpServers(mcpServers)
  })

/**
 * Add or update a single MCP server (exposed for direct invocation)
 */
export const addMcpServer = (name: string, config: McpServerConfig) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.addMcpServer(name, config)
  })

/**
 * Remove an MCP server (exposed for direct invocation)
 */
export const removeMcpServer = (name: string) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.removeMcpServer(name)
  })

/**
 * Toggle MCP server enabled/disabled (exposed for direct invocation)
 */
export const toggleMcpServer = (name: string, enabled: boolean) =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.toggleMcpServer(name, enabled)
  })

/**
 * Get MCP servers configuration (exposed for direct invocation)
 */
export const getMcpServers = () =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.getMcpServers
  })

/**
 * Get Claude Code executable path
 */
export const getClaudeExecutablePath = Effect.gen(function* () {
  const config = yield* getClaudeConfig
  return config.executablePath
})

/**
 * Sync Claude Code usage statistics (exposed for direct invocation)
 */
export const syncClaudeUsageStats = () =>
  Effect.gen(function* () {
    const claudeRef = yield* ClaudeRef
    return yield* claudeRef.syncUsageStats()
  })
