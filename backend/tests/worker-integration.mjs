#!/usr/bin/env node

import assert from 'node:assert/strict'

const baseUrl = new URL(process.env.WORKER_BASE_URL || 'http://127.0.0.1:8788')
const setupToken = process.env.ADMIN_SETUP_TOKEN
const allowedHosts = new Set(['127.0.0.1', 'localhost', '::1'])

if (baseUrl.protocol !== 'http:' || !allowedHosts.has(baseUrl.hostname)) {
  throw new Error('Refusing to run: WORKER_BASE_URL must be an HTTP loopback address')
}
if (!setupToken || setupToken.length < 32) {
  throw new Error('ADMIN_SETUP_TOKEN must contain the local one-time setup token (at least 32 characters)')
}

const adminUsername = 'admin_smoke'
const updatedAdminUsername = 'operator_smoke'
const adminPassword = 'Admin-Smoke-2026!'
const updatedAdminPassword = 'Admin-Smoke-Updated-2026!'
const userUsername = 'user_smoke'
const userPassword = 'User-Smoke-2026!'
const testDomain = `smoke-${Date.now().toString(36)}.example.test`

async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(new URL(path, baseUrl), {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: options.redirect || 'follow'
  })
  const text = await response.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      // Redirects and static responses are intentionally allowed to be non-JSON.
    }
  }
  return { response, status: response.status, text, json }
}

function expectStatus(result, status, label) {
  assert.equal(
    result.status,
    status,
    `${label}: expected HTTP ${status}, received ${result.status}: ${result.text}`
  )
}

function expectSuccess(result, status, label) {
  expectStatus(result, status, label)
  assert.equal(result.json?.success, true, `${label}: response was not successful: ${result.text}`)
  return result.json.data
}

async function updateSettings(token, settings, label) {
  const result = await request('/api/admin/settings', {
    method: 'PUT',
    token,
    body: { settings }
  })
  expectSuccess(result, 200, label)
}

const health = await request('/api/health')
expectSuccess(health, 200, 'health check')

const initialBootstrapStatus = await request('/api/auth/bootstrap-status')
const initialBootstrap = expectSuccess(initialBootstrapStatus, 200, 'initial bootstrap status')
assert.equal(
  initialBootstrap.required,
  true,
  'Refusing to mutate this local database because administrator bootstrap is already complete'
)

const bootstrapResult = await request('/api/auth/bootstrap', {
  method: 'POST',
  body: {
    setupToken,
    username: adminUsername,
    email: 'admin-smoke@example.test',
    password: adminPassword,
    confirmPassword: adminPassword
  }
})
const bootstrapped = expectSuccess(bootstrapResult, 200, 'administrator bootstrap')
assert.equal(bootstrapped.user.username, adminUsername)
assert.equal(bootstrapped.user.role, 'admin')
assert.ok(bootstrapped.tokens.accessToken)
assert.ok(bootstrapped.tokens.refreshToken)
let adminToken = bootstrapped.tokens.accessToken

const finalBootstrapStatus = await request('/api/auth/bootstrap-status')
assert.equal(
  expectSuccess(finalBootstrapStatus, 200, 'completed bootstrap status').required,
  false
)

const duplicateBootstrap = await request('/api/auth/bootstrap', {
  method: 'POST',
  body: {
    setupToken,
    username: 'should_not_exist',
    password: adminPassword,
    confirmPassword: adminPassword
  }
})
expectStatus(duplicateBootstrap, 400, 'duplicate administrator bootstrap rejection')

const initialAdminLogin = await request('/api/auth/login', {
  method: 'POST',
  body: { account: adminUsername, password: adminPassword }
})
expectSuccess(initialAdminLogin, 200, 'administrator username/password login')

const initialAdminSettings = await request('/api/admin/settings', { token: adminToken })
const initialSettings = expectSuccess(initialAdminSettings, 200, 'administrator settings read')
assert.ok(Array.isArray(initialSettings))
assert.equal(initialSettings.find(setting => setting.setting_key === 'admin_password')?.setting_value, '********')

const incompleteTurnstile = await request('/api/admin/settings', {
  method: 'PUT',
  token: adminToken,
  body: { settings: { turnstile_enabled: 'true' } }
})
expectStatus(incompleteTurnstile, 400, 'incomplete Turnstile configuration rejection')

const incompleteGithub = await request('/api/admin/settings', {
  method: 'PUT',
  token: adminToken,
  body: { settings: { github_oauth_enabled: 'true' } }
})
expectStatus(incompleteGithub, 400, 'incomplete GitHub configuration rejection')

const disabledGithub = await request('/api/auth/github', { redirect: 'manual' })
expectStatus(disabledGithub, 400, 'disabled GitHub login rejection')

await updateSettings(adminToken, {
  turnstile_site_key: '1x00000000000000000000AA',
  turnstile_secret_key: '1x0000000000000000000000000000000AA',
  turnstile_login_enabled: 'true',
  turnstile_enabled: 'true'
}, 'Turnstile configuration')

const turnstilePublicSettings = expectSuccess(
  await request('/api/public/settings'),
  200,
  'Turnstile public settings'
)
assert.equal(turnstilePublicSettings.turnstileEnabled, true)
assert.equal(turnstilePublicSettings.turnstileLoginEnabled, true)
assert.equal(turnstilePublicSettings.turnstileSiteKey, '1x00000000000000000000AA')

const loginWithoutChallenge = await request('/api/auth/login', {
  method: 'POST',
  body: { account: adminUsername, password: adminPassword }
})
expectStatus(loginWithoutChallenge, 400, 'login challenge enforcement')

const maskedTurnstileSettings = expectSuccess(
  await request('/api/admin/settings', { token: adminToken }),
  200,
  'masked Turnstile settings'
)
assert.equal(
  maskedTurnstileSettings.find(setting => setting.setting_key === 'turnstile_secret_key')?.setting_value,
  '********'
)

await updateSettings(adminToken, {
  turnstile_enabled: 'false',
  turnstile_login_enabled: 'false'
}, 'Turnstile disable')

await updateSettings(adminToken, {
  github_client_id: 'integration-client-id',
  github_client_secret: 'integration-client-secret',
  github_oauth_enabled: 'true'
}, 'GitHub OAuth configuration')

const githubPublicSettings = expectSuccess(
  await request('/api/public/settings'),
  200,
  'GitHub public settings'
)
assert.equal(githubPublicSettings.githubEnabled, true)

const githubRedirect = await request('/api/auth/github', { redirect: 'manual' })
expectStatus(githubRedirect, 302, 'configured GitHub authorization redirect')
const githubLocation = new URL(githubRedirect.response.headers.get('location'))
assert.equal(githubLocation.origin, 'https://github.com')
assert.equal(githubLocation.searchParams.get('client_id'), 'integration-client-id')
assert.equal(
  githubLocation.searchParams.get('redirect_uri'),
  new URL('/api/auth/github/callback', baseUrl).toString()
)
assert.match(githubRedirect.response.headers.get('set-cookie') || '', /HttpOnly/)

const maskedGithubSettings = expectSuccess(
  await request('/api/admin/settings', { token: adminToken }),
  200,
  'masked GitHub settings'
)
assert.equal(
  maskedGithubSettings.find(setting => setting.setting_key === 'github_client_secret')?.setting_value,
  '********'
)

await updateSettings(adminToken, { github_oauth_enabled: 'false' }, 'GitHub OAuth disable')
expectStatus(
  await request('/api/auth/github', { redirect: 'manual' }),
  400,
  'disabled configured GitHub login rejection'
)

await updateSettings(adminToken, { registration_enabled: 'false' }, 'registration disable')
assert.equal(
  expectSuccess(await request('/api/public/settings'), 200, 'disabled registration settings').registrationEnabled,
  false
)

const disabledRegistration = await request('/api/auth/register', {
  method: 'POST',
  body: {
    email: 'disabled-registration@example.test',
    username: 'disabled_registration',
    password: userPassword,
    confirmPassword: userPassword
  }
})
expectStatus(disabledRegistration, 400, 'disabled registration rejection')

await updateSettings(adminToken, { registration_enabled: 'true' }, 'registration enable')
assert.equal(
  expectSuccess(await request('/api/public/settings'), 200, 'enabled registration settings').registrationEnabled,
  true
)

const registration = await request('/api/auth/register', {
  method: 'POST',
  body: {
    email: 'user-smoke@example.test',
    username: userUsername,
    password: userPassword,
    confirmPassword: userPassword
  }
})
const registered = expectSuccess(registration, 201, 'enabled user registration')
assert.equal(registered.user.username, userUsername)
assert.ok(registered.tokens.accessToken)
const userToken = registered.tokens.accessToken

const userLogin = await request('/api/auth/login', {
  method: 'POST',
  body: { account: userUsername, password: userPassword }
})
expectSuccess(userLogin, 200, 'registered user login')

await updateSettings(adminToken, {
  admin_username: updatedAdminUsername,
  admin_password: updatedAdminPassword
}, 'administrator credentials update')

expectStatus(
  await request('/api/auth/refresh', {
    method: 'POST',
    body: { refreshToken: bootstrapped.tokens.refreshToken }
  }),
  401,
  'old administrator refresh-token revocation'
)
expectStatus(
  await request('/api/auth/login', {
    method: 'POST',
    body: { account: adminUsername, password: adminPassword }
  }),
  401,
  'old administrator credentials rejection'
)

const updatedAdminLogin = await request('/api/auth/login', {
  method: 'POST',
  body: { account: updatedAdminUsername, password: updatedAdminPassword }
})
const updatedAdmin = expectSuccess(updatedAdminLogin, 200, 'updated administrator credentials login')
adminToken = updatedAdmin.tokens.accessToken

const configuredAdminSettings = expectSuccess(
  await request('/api/admin/settings', { token: adminToken }),
  200,
  'updated administrator settings read'
)
assert.equal(
  configuredAdminSettings.find(setting => setting.setting_key === 'admin_username')?.setting_value,
  updatedAdminUsername
)
assert.equal(
  configuredAdminSettings.find(setting => setting.setting_key === 'admin_password')?.setting_value,
  '********'
)

const createdDomain = expectSuccess(
  await request('/api/admin/domains', {
    method: 'POST',
    token: adminToken,
    body: { domain: testDomain, status: 1 }
  }),
  200,
  'domain creation'
)
assert.equal(createdDomain.domain, testDomain)
assert.equal(Number(createdDomain.status), 1)

const publicDomains = expectSuccess(await request('/api/email/domains'), 200, 'public domain listing')
assert.ok(publicDomains.some(domain => domain.id === createdDomain.id))

const quotaBefore = expectSuccess(
  await request('/api/email/quota', { token: userToken }),
  200,
  'initial user quota'
)
assert.ok(quotaBefore.quota > 0)

const createdMailbox = expectSuccess(
  await request('/api/email/create', {
    method: 'POST',
    token: userToken,
    body: { domainId: createdDomain.id }
  }),
  200,
  'mailbox creation'
)
assert.equal(createdMailbox.tempEmail.domain_id, createdDomain.id)
assert.equal(createdMailbox.userQuota, quotaBefore.quota - 1)

const quotaAfter = expectSuccess(
  await request('/api/email/quota', { token: userToken }),
  200,
  'quota after mailbox creation'
)
assert.equal(quotaAfter.quota, quotaBefore.quota - 1)

const quotaLogs = expectSuccess(
  await request('/api/quota/logs?page=1&limit=100', { token: userToken }),
  200,
  'quota ledger after mailbox creation'
)
const matchingConsumption = quotaLogs.logs.filter(log =>
  log.source === 'create_email' && Number(log.related_id) === createdMailbox.tempEmail.id
)
assert.equal(matchingConsumption.length, 1)
assert.equal(matchingConsumption[0].type, 'consume')
assert.equal(matchingConsumption[0].amount, 1)

const publicMailbox = expectSuccess(
  await request(`/api/email/temp-emails/${createdMailbox.tempEmail.id}/public-inbox`, {
    method: 'PUT',
    token: userToken,
    body: { publicInboxEnabled: true }
  }),
  200,
  'public inbox enable'
)
assert.equal(Boolean(publicMailbox.public_inbox_enabled), true)

const initialPublicInbox = expectSuccess(
  await request('/api/email/public-inbox', {
    method: 'POST',
    body: { email: createdMailbox.tempEmail.email, page: 1, limit: 20 }
  }),
  200,
  'public inbox access'
)
assert.ok(initialPublicInbox.publicAccessToken)

expectSuccess(
  await request(`/api/admin/domains/${createdDomain.id}`, {
    method: 'DELETE',
    token: adminToken
  }),
  200,
  'domain deletion'
)

const domainsAfterDelete = expectSuccess(await request('/api/email/domains'), 200, 'domains after deletion')
assert.ok(!domainsAfterDelete.some(domain => domain.id === createdDomain.id))
const mailboxesAfterDelete = expectSuccess(
  await request('/api/email/temp-emails', { token: userToken }),
  200,
  'mailboxes after domain deletion'
)
assert.ok(!mailboxesAfterDelete.some(mailbox => mailbox.id === createdMailbox.tempEmail.id))

expectStatus(
  await request('/api/email/public-inbox', {
    method: 'POST',
    body: {
      email: createdMailbox.tempEmail.email,
      publicAccessToken: initialPublicInbox.publicAccessToken,
      page: 1,
      limit: 20
    }
  }),
  404,
  'deleted-domain public inbox rejection'
)

const restoredDomain = expectSuccess(
  await request('/api/admin/domains', {
    method: 'POST',
    token: adminToken,
    body: { domain: testDomain, status: 1 }
  }),
  200,
  'domain restoration'
)
assert.equal(restoredDomain.id, createdDomain.id)

const mailboxesAfterRestore = expectSuccess(
  await request('/api/email/temp-emails', { token: userToken }),
  200,
  'mailboxes after domain restoration'
)
assert.ok(!mailboxesAfterRestore.some(mailbox => mailbox.id === createdMailbox.tempEmail.id))
expectStatus(
  await request('/api/email/public-inbox', {
    method: 'POST',
    body: {
      email: createdMailbox.tempEmail.email,
      publicAccessToken: initialPublicInbox.publicAccessToken,
      page: 1,
      limit: 20
    }
  }),
  404,
  'restored-domain old mailbox isolation'
)

const replacementMailbox = expectSuccess(
  await request('/api/email/create', {
    method: 'POST',
    token: userToken,
    body: { domainId: restoredDomain.id }
  }),
  200,
  'replacement mailbox creation'
)
assert.notEqual(replacementMailbox.tempEmail.id, createdMailbox.tempEmail.id)
assert.equal(replacementMailbox.userQuota, quotaAfter.quota - 1)

expectSuccess(
  await request(`/api/admin/domains/${restoredDomain.id}`, {
    method: 'DELETE',
    token: adminToken
  }),
  200,
  'restored domain cleanup'
)

console.log('Worker integration smoke test passed')
