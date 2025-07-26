import { useIPCRef } from '../../ipcref/hooks.js'
import { ClaudeStateSchema, type ClaudeState, type McpServerConfig } from '@slide.code/schema'

/**
 * Hook for accessing the Claude ref state
 * Returns Claude Code configuration including MCP servers
 *
 * @example
 * const [claudeState, setClaudeState, updateClaudeState] = useClaudeRef()
 *
 * // Access MCP servers
 * console.log(claudeState?.mcpServers)
 *
 * // Update executable path
 * updateClaudeState((state) => ({
 *   ...state,
 *   executablePath: '/new/path/to/claude'
 * }))
 */
export function useClaudeRef() {
  return useIPCRef<ClaudeState>('claude', ClaudeStateSchema)
}

/**
 * Hook for MCP server management
 * Provides utilities for managing MCP servers in the Claude state
 */
export function useMcpServers() {
  const [claudeState, , updateClaudeState] = useClaudeRef()

  const mcpServers = claudeState?.mcpServers || {}

  const updateMcpServers = (mcpServers: Record<string, McpServerConfig>) => {
    updateClaudeState((state) => ({
      ...state,
      mcpServers
    }))
  }

  const addMcpServer = (name: string, config: McpServerConfig) => {
    updateClaudeState((state) => ({
      ...state,
      mcpServers: {
        ...state.mcpServers,
        [name]: config
      }
    }))
  }

  const removeMcpServer = (name: string) => {
    updateClaudeState((state) => {
      const newMcpServers = { ...state.mcpServers }
      delete newMcpServers[name]
      return {
        ...state,
        mcpServers: newMcpServers
      }
    })
  }

  const toggleMcpServer = (name: string, enabled: boolean) => {
    updateClaudeState((state) => {
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
  }

  return {
    mcpServers,
    updateMcpServers,
    addMcpServer,
    removeMcpServer,
    toggleMcpServer
  }
}

/**
 * Hook for Claude Code executable management
 */
export function useClaudeExecutable() {
  const [claudeState, , updateClaudeState] = useClaudeRef()

  const executablePath = claudeState?.executablePath || null
  const lastDetected = claudeState?.lastDetected || null
  const isAuthenticated = claudeState?.isAuthenticated || false

  const updateExecutablePath = (path: string | null) => {
    updateClaudeState((state) => ({
      ...state,
      executablePath: path,
      lastDetected: path ? Date.now() : null
    }))
  }

  const updateAuthStatus = (isAuthenticated: boolean) => {
    updateClaudeState((state) => ({
      ...state,
      isAuthenticated,
      lastAuthCheck: Date.now()
    }))
  }

  return {
    executablePath,
    lastDetected,
    isAuthenticated,
    updateExecutablePath,
    updateAuthStatus
  }
}

/**
 * Hook for Claude Code usage statistics
 */
export function useClaudeStats() {
  const [claudeState] = useClaudeRef()

  const stats = claudeState?.stats || {
    totalRequests: 0,
    totalCost: 0,
    lastUsed: null,
    lastSyncTime: null
  }

  return {
    stats
  }
}
