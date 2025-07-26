/**
 * MCP Server configuration types
 */
export interface McpStdioServerConfig {
  type?: 'stdio' // Optional for backwards compatibility
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled?: boolean
}

export interface McpSSEServerConfig {
  type: 'sse'
  url: string
  headers?: Record<string, string>
  enabled?: boolean
}

export interface McpHttpServerConfig {
  type: 'http'
  url: string
  headers?: Record<string, string>
  enabled?: boolean
}

export type McpServerConfig = McpStdioServerConfig | McpSSEServerConfig | McpHttpServerConfig

/**
 * Claude Code configuration interface
 */
export interface ClaudeCodeConfig {
  workingDirectory?: string
  maxTurns?: number
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  model?: string
  fallbackModel?: string
  pathToClaudeCodeExecutable?: string
  mcpServers?: Record<string, McpServerConfig>
}

/**
 * Default Claude Code configuration
 */
export const defaultClaudeCodeConfig: ClaudeCodeConfig = {
  maxTurns: 10,
  permissionMode: 'bypassPermissions',
  model: 'claude-sonnet-4-20250514',
  fallbackModel: 'claude-3-haiku-20240307',
  mcpServers: {
    context7: {
      command: 'npx',
      args: ['-y', '@upstash/context7-mcp'],
      enabled: true
    }
  }
}

/**
 * Errors that can be thrown by Claude Code operations
 */
export class ClaudeCodeError extends Error {
  readonly _tag = 'ClaudeCodeError'

  constructor(message: string) {
    super(message)
    this.name = 'ClaudeCodeError'
  }
}
