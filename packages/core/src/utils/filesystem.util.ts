import { Effect } from 'effect'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

export class FilesystemError extends Error {
  readonly _tag = 'FilesystemError'
  constructor(
    message: string,
    public override readonly cause?: Error
  ) {
    super(message)
    this.name = 'FilesystemError'
  }
}

/**
 * Check if a path exists
 */
export const pathExists = (targetPath: string) =>
  Effect.tryPromise({
    try: async () => {
      try {
        await fs.access(targetPath)
        return true
      } catch {
        return false
      }
    },
    catch: (error) =>
      new FilesystemError(`Failed to check if path exists: ${targetPath}`, error as Error)
  })

/**
 * Create a directory recursively
 */
export const createDirectory = (directoryPath: string) =>
  Effect.tryPromise({
    try: () => fs.mkdir(directoryPath, { recursive: true }),
    catch: (error) =>
      new FilesystemError(`Failed to create directory: ${directoryPath}`, error as Error)
  })

/**
 * Ensure a directory exists, create it if it doesn't
 */
export const ensureDirectory = (directoryPath: string) =>
  Effect.gen(function* () {
    const exists = yield* pathExists(directoryPath)
    if (!exists) {
      yield* createDirectory(directoryPath)
      yield* Effect.logInfo(`[FILESYSTEM] Created directory: ${directoryPath}`)
    }
    return directoryPath
  })

/**
 * Get directory stats
 */
export const getStats = (targetPath: string) =>
  Effect.tryPromise({
    try: () => fs.stat(targetPath),
    catch: (error) => new FilesystemError(`Failed to get stats for: ${targetPath}`, error as Error)
  })

/**
 * Check if path is a directory
 */
export const isDirectory = (targetPath: string) =>
  Effect.gen(function* () {
    const exists = yield* pathExists(targetPath)
    if (!exists) return false

    const stats = yield* getStats(targetPath)
    return stats.isDirectory()
  })

/**
 * Sanitize a name for use in filesystem paths
 */
export const sanitizePathName = (name: string): string => {
  return name
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid characters with dash
    .replace(/\s+/g, '-') // Replace spaces with dash
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .toLowerCase()
    .trim()
}
