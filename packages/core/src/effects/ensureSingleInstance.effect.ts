import { Effect } from 'effect'
import { app } from 'electron'

export const ensureSingleInstance = Effect.sync(() => {
  const hasLock = app.requestSingleInstanceLock()
  if (!hasLock) {
    app.quit()
    process.exit(0)
  }
})
