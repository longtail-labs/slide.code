import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'turso',
  schema: './packages/schema/src/drizzle.ts',
  out: './drizzle',
  dbCredentials: {
    url: `file:./test-db.sqlite.db`
  },
  strict: true,
  verbose: true
})
