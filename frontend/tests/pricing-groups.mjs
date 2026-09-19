import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/pricing.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
})
const { mergePricingGroup, validatePricingContent } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

const saved = {
  plans: [{
    id: 'starter', name: '入门套餐', price: '¥9.9', originalPrice: '', description: '',
    quota: 50, bonusQuota: 10, popular: false, enabled: true, features: ['50 个邮箱'],
    buttonText: '了解详情', buttonAction: 'link', buttonUrl: '/pricing',
  }],
  faqs: [{ id: 'usage', question: '如何使用？', answer: '创建一个临时邮箱。' }],
}
const initial = JSON.stringify(saved)
const planDraft = structuredClone(saved.plans)
planDraft[0].price = '¥12.9'
const unfinishedFaqDraft = [{ id: 'new', question: '', answer: '' }]

// An unfinished FAQ must not block or leak into a valid plan save.
assert.notEqual(validatePricingContent(JSON.stringify({ plans: planDraft, faqs: unfinishedFaqDraft })), '')
const planUpdate = mergePricingGroup(initial, 'plans', JSON.stringify(planDraft))
assert.equal(validatePricingContent(planUpdate), '')
assert.deepEqual(JSON.parse(planUpdate), { plans: planDraft, faqs: saved.faqs })
assert.equal(initial, JSON.stringify(saved), 'Building an update must not change the saved snapshot')

// Saving the second group later must retain the first group's newly saved content.
const faqDraft = [{ id: 'usage', question: '如何使用？', answer: '进入控制台创建邮箱。' }]
const faqUpdate = mergePricingGroup(planUpdate, 'faqs', JSON.stringify(faqDraft))
assert.equal(validatePricingContent(faqUpdate), '')
assert.deepEqual(JSON.parse(faqUpdate), { plans: planDraft, faqs: faqDraft })

// Save order can be reversed without publishing an unfinished plan.
const unfinishedPlanDraft = structuredClone(saved.plans)
unfinishedPlanDraft[0].price = ''
assert.notEqual(validatePricingContent(JSON.stringify({ plans: unfinishedPlanDraft, faqs: faqDraft })), '')
assert.deepEqual(JSON.parse(mergePricingGroup(initial, 'faqs', JSON.stringify(faqDraft))), {
  plans: saved.plans, faqs: faqDraft,
})

// Clearing one group leaves the other intact; unsafe links still fail validation.
assert.deepEqual(JSON.parse(mergePricingGroup(faqUpdate, 'plans', '[]')), { plans: [], faqs: faqDraft })
assert.deepEqual(JSON.parse(mergePricingGroup(faqUpdate, 'faqs', '[]')), { plans: planDraft, faqs: [] })
planDraft[0].buttonUrl = 'javascript:alert(1)'
assert.notEqual(validatePricingContent(mergePricingGroup(initial, 'plans', JSON.stringify(planDraft))), '')
console.log('PASS: independent pricing group saves, draft isolation, save ordering, empty groups and link validation')
