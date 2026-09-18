import assert from 'node:assert/strict'

// Run against a fresh, migrated local Worker database only.
const base = new URL(process.env.WORKER_BASE_URL || 'http://127.0.0.1:8787')
if (base.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(base.hostname)) {
  throw new Error('This test only accepts a loopback Worker URL')
}
const setupToken = process.env.ADMIN_SETUP_TOKEN
assert.ok(setupToken?.length >= 32, 'A local bootstrap token is required')

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, ...(await response.json()) }
}
function success(result, status = 200) {
  assert.equal(result.status, status, result.error || 'Unexpected HTTP status')
  assert.equal(result.success, true)
  return result.data
}

assert.equal(
  success(await request('/api/auth/bootstrap-status')).required,
  true,
  'Use a fresh local database',
)
const admin = success(
  await request('/api/auth/bootstrap', {
    method: 'POST',
    body: {
      setupToken,
      username: 'content_admin',
      email: 'content-admin@example.test',
      password: 'Local-Content-2026!',
      confirmPassword: 'Local-Content-2026!',
    },
  }),
)
const token = admin.tokens.accessToken
const save = (settings) =>
  request('/api/admin/settings', { method: 'PUT', token, body: { settings } })
const readPublic = async () => success(await request('/api/public/settings'))
const initial = await readPublic()
assert.equal(initial.siteName, '临时邮箱管理系统')
assert.equal(initial.contactEmail, '')
assert.equal(initial.pricing.plans.length, 4)
assert.equal(initial.pricing.faqs.length, 5)
const settings = success(await request('/api/admin/settings', { token }))
const originalPricing = settings.find((row) => row.setting_key === 'pricing_content').setting_value
assert.deepEqual(JSON.parse(originalPricing), initial.pricing)

assert.ok(
  [401, 403].includes(
    (
      await request('/api/admin/settings', {
        method: 'PUT',
        body: { settings: { site_name: 'unauthorized' } },
      })
    ).status,
  ),
)
const user = success(
  await request('/api/auth/register', {
    method: 'POST',
    body: {
      username: 'content_user',
      email: 'content-user@example.test',
      password: 'Local-User-2026!',
      confirmPassword: 'Local-User-2026!',
    },
  }),
  201,
)
assert.equal(
  (
    await request('/api/admin/settings', {
      method: 'PUT',
      token: user.tokens.accessToken,
      body: { settings: { site_name: 'unauthorized' } },
    })
  ).status,
  403,
)

const content = JSON.parse(originalPricing)
Object.assign(content.plans[0], {
  name: '移动端验证套餐',
  price: '¥12.5',
  quota: 60,
  bonusQuota: 4,
  buttonText: '准备上线',
  buttonAction: 'text',
  buttonUrl: 'javascript:discarded',
})
Object.assign(content.plans[1], {
  buttonText: '前往配额管理',
  buttonAction: 'link',
  buttonUrl: '/profile/quota',
})
Object.assign(content.plans[2], {
  buttonText: '了解详情',
  buttonAction: 'link',
  buttonUrl: 'https://example.test/plans/premium',
})
content.plans[3].enabled = false
content.plans.reverse()
content.faqs[0].answer = '可在后台维护的回答'
success(
  await save({
    site_name: '  薄荷邮箱测试站  ',
    contact_email: 'Help@Example.test',
    contact_email_enabled: 'false',
    pricing_content: JSON.stringify(content),
  }),
)
let published = await readPublic()
assert.equal(published.siteName, '薄荷邮箱测试站')
assert.equal(published.contactEmail, '')
assert.equal(
  JSON.stringify(published).includes('help@example.test'),
  false,
  'Hidden contact email must not leave the public API',
)
assert.deepEqual(
  published.pricing.plans.map((plan) => plan.id),
  ['premium', 'standard', 'starter'],
)
assert.equal(
  published.pricing.plans[2].buttonUrl,
  '',
  'Text-only buttons must not retain executable URLs',
)
assert.equal(published.pricing.faqs[0].answer, '可在后台维护的回答')
assert.equal(published.pricing.plans[1].buttonUrl, '/profile/quota')
assert.equal(published.pricing.plans[0].buttonUrl, 'https://example.test/plans/premium')
success(await save({ contact_email_enabled: 'true' }))
assert.equal((await readPublic()).contactEmail, 'help@example.test')
const stored = success(await request('/api/admin/settings', { token }))
assert.equal(
  JSON.parse(stored.find((row) => row.setting_key === 'pricing_content').setting_value).plans
    .length,
  4,
  'Unpublished plans remain editable',
)
assert.equal(
  stored.find((row) => row.setting_key === 'contact_email').setting_value,
  'help@example.test',
)

for (const url of [
  'javascript:alert(1)',
  'data:text/html,hi',
  '//example.test',
  '/\\example.test',
  'https://user:password@example.test',
  'https://example.test/\nnext',
  '',
]) {
  const bad = JSON.parse(originalPricing)
  Object.assign(bad.plans[0], { buttonAction: 'link', buttonUrl: url })
  assert.equal(
    (await save({ site_name: 'must not be saved', pricing_content: JSON.stringify(bad) })).status,
    400,
    `Reject unsafe URL: ${JSON.stringify(url)}`,
  )
}
assert.equal((await readPublic()).siteName, '薄荷邮箱测试站', 'A rejected batch must be atomic')
for (const patch of [
  { site_name: '' },
  { site_name: '长'.repeat(41) },
  { contact_email: 'not-an-email' },
  { contact_email: 'bad\u0000@example.test' },
  { contact_email: '', contact_email_enabled: 'true' },
  { pricing_content: '{bad json' },
])
  assert.equal((await save(patch)).status, 400)
for (const mutate of [
  (value) => (value.plans[0].quota = -1),
  (value) => (value.plans[0].bonusQuota = 1.5),
  (value) => (value.plans[0].enabled = 'false'),
  (value) => (value.plans[1].id = value.plans[0].id),
  (value) => (value.plans[0].buttonText = ''),
]) {
  const bad = JSON.parse(originalPricing)
  mutate(bad)
  assert.equal((await save({ pricing_content: JSON.stringify(bad) })).status, 400)
}
success(await save({ contact_email_enabled: 'false' }))
assert.equal((await readPublic()).contactEmail, '')
success(await save({ pricing_content: JSON.stringify({ plans: [], faqs: [] }) }))
assert.deepEqual((await readPublic()).pricing, { plans: [], faqs: [] })
success(
  await save({
    site_name: initial.siteName,
    contact_email: '',
    contact_email_enabled: 'false',
    pricing_content: originalPricing,
  }),
)
published = await readPublic()
assert.deepEqual(published, initial)
console.log(
  'PASS: defaults, persistence, ordering, publication, contact privacy, authorization, safe links, atomic validation, and empty pricing content',
)
