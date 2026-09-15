import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/site-url.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } })
const { getGitHubCallbackUrl, getSiteOrigin } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const production = { FRONTEND_DOMAIN: 'oooo.icu', ENVIRONMENT: 'production' }
assert.equal(getGitHubCallbackUrl(production, 'https://api.oooo.icu/api/auth/github'), 'https://oooo.icu/api/auth/github/callback')
assert.equal(getGitHubCallbackUrl(production, 'https://oooo.icu/admin/settings'), 'https://oooo.icu/api/auth/github/callback')
assert.equal(getGitHubCallbackUrl({ FRONTEND_DOMAIN: 'https://mail.example.test/ignored?query=1', ENVIRONMENT: 'production' }), 'https://mail.example.test/api/auth/github/callback')
assert.equal(getGitHubCallbackUrl({ ENVIRONMENT: 'development' }, 'http://localhost:8787/admin/settings'), 'http://localhost:8787/api/auth/github/callback')
assert.equal(getSiteOrigin({ FRONTEND_DOMAIN: 'localhost:8788', ENVIRONMENT: 'development' }), 'http://localhost:8788')
console.log('PASS: GitHub callback is fixed to the deployment origin; development ports are preserved')
