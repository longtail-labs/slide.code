import { Effect } from 'effect'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import log from 'electron-log'

export class VibeDirectoryCreationError extends Error {
  readonly _tag = 'VibeDirectoryCreationError'

  constructor(message: string) {
    super(message)
    this.name = 'VibeDirectoryCreationError'
  }
}

export const createVibeDir = Effect.tryPromise({
  try: async () => {
    const vibeDir = path.join(os.homedir(), 'Documents', 'vibe-dir')
    if (!fs.existsSync(vibeDir)) {
      log.info('[createVibeDir] Creating vibe-dir at:', vibeDir)
      await fs.promises.mkdir(vibeDir, { recursive: true })
      log.info('[createVibeDir] vibe-dir created successfully')
    } else {
      log.info('[createVibeDir] vibe-dir already exists at:', vibeDir)
    }
    return vibeDir
  },
  catch: (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('[createVibeDir] Failed to create vibe-dir:', errorMessage)
    return new VibeDirectoryCreationError(`Failed to create vibe-dir: ${errorMessage}`)
  }
})
