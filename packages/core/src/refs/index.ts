export * from './ipc/app-ready.ref.js'
export * from './ipc/theme.ref.js'
export * from './ipc/update.ref.js'
export * from './ipc/user.ref.js'

import { Layer } from 'effect'
import { AppReadyRefLive, ThemeRefLive, UpdateRefLive, UserRefLive } from './ipc/index.js'
/**
 * Combined layer for all refs
 */
export const RefsLayer = Layer.mergeAll(AppReadyRefLive, ThemeRefLive, UpdateRefLive, UserRefLive)
