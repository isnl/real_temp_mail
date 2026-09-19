import type { PricingContent } from '@/types'

export type PricingPart = keyof PricingContent

// Only merge the selected group's draft. Other groups must use the last saved
// content so that saving plans cannot accidentally publish an unfinished FAQ.
export function mergePricingGroup(savedContent: string, part: PricingPart, draft: string): string {
  const saved: PricingContent = JSON.parse(savedContent)
  return JSON.stringify({ ...saved, [part]: JSON.parse(draft) })
}

export function isSafePricingLink(value: string): boolean {
  if (!value || /[\\\u0000-\u0020\u007f]/.test(value)) return false
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch {
    return false
  }
}

export function validatePricingContent(value: string): string {
  let content: PricingContent
  try {
    content = JSON.parse(value)
  } catch {
    return '价格内容加载失败，请重新打开设置'
  }
  if (!Array.isArray(content?.plans) || !Array.isArray(content?.faqs)) return '价格内容格式不正确'
  for (const [index, plan] of content.plans.entries()) {
    if (!plan.name.trim() || !plan.price.trim() || !plan.buttonText.trim())
      return `请填写套餐 ${index + 1} 的名称、价格和按钮文字`
    if (plan.buttonAction === 'link' && !isSafePricingLink(plan.buttonUrl.trim()))
      return `套餐 ${index + 1} 的跳转链接须为 HTTP(S) 地址或以 / 开头的站内路径`
    if (
      ![plan.quota, plan.bonusQuota].every(
        (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000,
      )
    )
      return `套餐 ${index + 1} 的配额须为 0–1000000 的整数`
  }
  if (content.faqs.some((faq) => !faq.question.trim() || !faq.answer.trim()))
    return '请完整填写常见问题和回答'
  return ''
}
