// import { drizzle, type RemoteCallback } from 'drizzle-orm/pg-proxy'
import { drizzle, type RemoteCallback } from 'drizzle-orm/sqlite-proxy'

import { schema } from './index.js'

export const createDrizzleClient = (callback: RemoteCallback) => {
  return drizzle(callback, { schema, logger: true })
}
