import { Effect } from 'effect'
import fs from 'node:fs'
import log from 'electron-log'

import { getVibeDir } from '@slide.code/shared'

export class VibeDirectoryCreationError extends Error {
  readonly _tag = 'VibeDirectoryCreationError'

  constructor(message: string) {
    super(message)
    this.name = 'VibeDirectoryCreationError'
  }
}

export const createVibeDir = Effect.tryPromise({
  try: async () => {
    const vibeDir = getVibeDir()
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
