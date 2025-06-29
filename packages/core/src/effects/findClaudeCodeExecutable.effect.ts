import { Effect } from 'effect'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import which from 'which'
import log from 'electron-log'
import { ClaudeCodeError } from '../types/claude-code.types.js'

export const findClaudeCodeExecutable = Effect.tryPromise({
  try: async () => {
    // First, try to find claude using node-which
    const claudePath = await which('claude', { nothrow: true })

    if (claudePath) {
      log.info(`[findClaudeCodeExecutable] Found claude at: ${claudePath}`)

      // Verify it's executable
      try {
        const stats = fs.statSync(claudePath)
        if (stats.isFile() && !!(stats.mode & 0o111)) {
          log.info(`[findClaudeCodeExecutable] Claude executable verified: ${claudePath}`)
          return claudePath
        } else {
          log.warn(`[findClaudeCodeExecutable] Found claude but it's not executable: ${claudePath}`)
          return null
        }
      } catch (error) {
        log.error(`[findClaudeCodeExecutable] Error checking claude executable: ${error}`)
        return null
      }
    } else {
      log.info(`[findClaudeCodeExecutable] Claude not found in PATH`)

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
            log.info(`[findClaudeCodeExecutable] Found claude at common path: ${claudePath}`)
            return claudePath
          }
        } catch (error) {
          // Path doesn't exist, continue checking
          continue
        }
      }

      log.warn(`[findClaudeCodeExecutable] Could not find claude executable in any common paths`)
      return null
    }
  },
  catch: (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error(
      `[findClaudeCodeExecutable] Error during Claude executable detection: ${errorMessage}`
    )
    return new ClaudeCodeError(`Failed to detect Claude executable: ${errorMessage}`)
  }
})
