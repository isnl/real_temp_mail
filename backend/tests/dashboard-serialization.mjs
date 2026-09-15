import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// Load this standalone utility without emitting build files or needing a Worker.
const source = await readFile(new URL('../src/utils/datetime.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } })
const { normalizeApiTimestamps } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const response = { success: true, data: {
  users: { total: 1, active: 1, inactive: 0 },
  tempEmails: { total: 0, active: 0 },
  domains: { total: 1, active: 1 },
  redeemCodes: { total: 1, used: 0, unused: 1 },
} }
assert.deepEqual(normalizeApiTimestamps(response, { normalizeBooleans: false }), response)
assert.deepEqual(normalizeApiTimestamps([{ active: 1, used: 0, created_at: '2026-09-15 08:00:00' }]), [
  { active: true, used: false, created_at: '2026-09-15T08:00:00Z' },
])
assert.deepEqual(normalizeApiTimestamps([{ active: 0, used: 1, created_at: '2026-09-15 08:00:00' }], { normalizeBooleans: false }), [
  { active: 0, used: 1, created_at: '2026-09-15T08:00:00Z' },
])
console.log('PASS: dashboard counts stay numeric; record flags and UTC dates retain their existing behavior')
