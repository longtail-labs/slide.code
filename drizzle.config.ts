import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import type { Config } from 'drizzle-kit'

export default defineConfig({
  dialect: 'turso',
  schema: './packages/schema/src/drizzle.ts',
  out: './drizzle',
  dbCredentials: {
    url: `file:./test-db.sqlite.db`
    // url: process.env.TURSO_DATABASE_URL!,
    // authToken: process.env.TURSO_AUTH_TOKEN
  },
  strict: true,
  verbose: true
})
