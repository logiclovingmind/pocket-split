// Runs a SQL file against the provisioned database.
// Usage: node --env-file=.env.local scripts/setup-db.mjs [path/to/file.sql]
import { readFileSync } from 'node:fs'
import pg from 'pg'

const sqlFile = process.argv[2] ?? 'supabase/setup.sql'

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
if (!raw) {
  console.error('No POSTGRES_URL in env. Run: vercel env pull .env.local')
  process.exit(1)
}
// strip sslmode from the URL so the ssl option below wins
const url = new URL(raw)
url.searchParams.delete('sslmode')

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
})
await client.connect()
try {
  await client.query(readFileSync(sqlFile, 'utf8'))
  console.log(`${sqlFile} applied`)
  const { rows } = await client.query(
    "select count(*) from pg_policies where tablename = 'entries'"
  )
  console.log(`policies on entries: ${rows[0].count}`)
} finally {
  await client.end()
}
