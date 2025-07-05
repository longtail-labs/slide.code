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
}

/**
 * Default Claude Code configuration
 */
export const defaultClaudeCodeConfig: ClaudeCodeConfig = {
  maxTurns: 10,
  permissionMode: 'bypassPermissions',
  model: 'claude-sonnet-4-20250514',
  fallbackModel: 'claude-3-haiku-20240307'
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
