export * from './ipc/app-ready.ref.js'
export * from './ipc/theme.ref.js'
export * from './ipc/update.ref.js'
export * from './ipc/user.ref.js'

import { Layer } from 'effect'
import { AppReadyRefLive } from './ipc/app-ready.ref.js'
// import { UpdateRefLive } from './ipc/update.ref.js'
import { ThemeRefLive } from './ipc/theme.ref.js'
import { UserRef, UserRefLive } from './ipc/user.ref.js'
// import { WorkingRefLive } from './working.ref.js'

/**
 * Combined layer for all refs
 */
export const RefsLayer = Layer.mergeAll(
  AppReadyRefLive,
  // UpdateRefLive,
  ThemeRefLive,
  UserRefLive
  // WorkingRefLive
)

// export { UpdateRef } from './ipc/update.ref.js'
export { UserRef } from './ipc/user.ref.js'
