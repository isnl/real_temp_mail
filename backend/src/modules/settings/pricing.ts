import { ValidationError, type PricingContent, type PricingPlan } from '@/types'

export const DEFAULT_PRICING_CONTENT: PricingContent = {
  plans: [
    {
      id: 'starter',
      name: '入门套餐',
      description: '小量使用首选',
      price: '¥9.9',
      originalPrice: '¥19.9',
      quota: 50,
      bonusQuota: 10,
      popular: false,
      enabled: true,
      features: ['50个邮箱配额', '额外赠送10个配额'],
      buttonText: '咨询购买',
      buttonAction: 'text',
      buttonUrl: '',
    },
    {
      id: 'standard',
      name: '标准套餐',
      description: '最受欢迎的选择',
      price: '¥19.9',
      originalPrice: '¥39.9',
      quota: 100,
      bonusQuota: 30,
      popular: true,
      enabled: true,
      features: ['100个邮箱配额', '额外赠送30个配额'],
      buttonText: '咨询购买',
      buttonAction: 'text',
      buttonUrl: '',
    },
    {
      id: 'premium',
      name: '高级套餐',
      description: '适合重度使用',
      price: '¥39.9',
      originalPrice: '¥79.9',
      quota: 200,
      bonusQuota: 80,
      popular: false,
      enabled: true,
      features: ['200个邮箱配额', '额外赠送80个配额'],
      buttonText: '咨询购买',
      buttonAction: 'text',
      buttonUrl: '',
    },
    {
      id: 'pro',
      name: '专业套餐',
      description: '专业用户专享',
      price: '¥79.9',
      originalPrice: '¥159.9',
      quota: 500,
      bonusQuota: 200,
      popular: false,
      enabled: true,
      features: ['500个邮箱配额', '额外赠送200个配额'],
      buttonText: '咨询购买',
      buttonAction: 'text',
      buttonUrl: '',
    },
  ],
  faqs: [
    {
      id: 'usage',
      question: '配额是什么？如何使用？',
      answer:
        '配额用于创建临时邮箱，每创建一个地址消耗 1 个配额。不同来源的有效期可能不同，请以配额记录中的到期时间为准。',
    },
    {
      id: 'purchase',
      question: '如何购买配额？',
      answer:
        '请选择方案并联系管理员，或通过套餐按钮前往指定页面。具体价格、付款方式和发放时间以管理员确认为准。',
    },
    {
      id: 'delivery',
      question: '配额如何到账？',
      answer: '管理员确认后会提供兑换码或直接调整账户配额，您可以在配额记录中核对每一笔变动。',
    },
    {
      id: 'refund',
      question: '配额可以退款吗？',
      answer:
        '购买前请与管理员确认数量、有效期和售后规则；已经发放或使用的配额如何处理，以双方确认的方案为准。',
    },
    {
      id: 'choice',
      question: '如何选择合适的套餐？',
      answer:
        '建议根据您的使用频率选择：偶尔使用选择入门套餐，日常使用选择标准套餐，重度使用选择高级或专业套餐。',
    },
  ],
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ValidationError(`${label}格式不正确`)
  return value as Record<string, unknown>
}

function text(value: unknown, label: string, max: number, required = true): string {
  if (typeof value !== 'string') throw new ValidationError(`${label}必须为文字`)
  const result = value.trim()
  if ((required && !result) || result.length > max)
    throw new ValidationError(`${label}${required ? '不能为空，且' : ''}不能超过 ${max} 个字符`)
  return result
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1000000)
    throw new ValidationError(`${label}必须为 0–1000000 的整数`)
  return value
}

function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new ValidationError(`${label}必须为开关值`)
  return value
}

function uniqueId(value: unknown, ids: Set<string>): string {
  const id = text(value, '条目标识', 64)
  if (!/^[A-Za-z0-9_-]+$/.test(id) || ids.has(id)) throw new ValidationError('条目标识无效或重复')
  ids.add(id)
  return id
}

export function normalizePricingLink(input: unknown): string {
  const value = text(input, '跳转链接', 1024)
  if (/[\\\u0000-\u0020\u007f]/.test(value))
    throw new ValidationError('跳转链接不能包含空白或反斜杠')
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password)
      return url.toString()
  } catch {
    /* Use the same validation message for all unsupported links. */
  }
  throw new ValidationError('跳转链接须为 HTTP(S) 地址或以 / 开头的站内路径')
}

export function parsePricingContent(input: string): PricingContent {
  if (input.length > 100000) throw new ValidationError('价格内容过长')
  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    throw new ValidationError('价格内容格式不正确')
  }
  const root = record(parsed, '价格内容')
  if (!Array.isArray(root.plans) || root.plans.length > 20)
    throw new ValidationError('最多配置 20 个套餐')
  if (!Array.isArray(root.faqs) || root.faqs.length > 30)
    throw new ValidationError('最多配置 30 个常见问题')
  const planIds = new Set<string>()
  const faqIds = new Set<string>()
  const plans = root.plans.map((item, index): PricingPlan => {
    const plan = record(item, `套餐 ${index + 1}`)
    const label = `套餐 ${index + 1}`
    if (!Array.isArray(plan.features) || plan.features.length > 20)
      throw new ValidationError(`${label}最多配置 20 条权益`)
    if (plan.buttonAction !== 'text' && plan.buttonAction !== 'link')
      throw new ValidationError(`${label}按钮方式无效`)
    return {
      id: uniqueId(plan.id, planIds),
      name: text(plan.name, `${label}名称`, 60),
      description: text(plan.description, `${label}说明`, 200, false),
      price: text(plan.price, `${label}价格`, 40),
      originalPrice: text(plan.originalPrice, `${label}原价`, 40, false),
      quota: integer(plan.quota, `${label}配额`),
      bonusQuota: integer(plan.bonusQuota, `${label}赠送配额`),
      popular: flag(plan.popular, `${label}推荐状态`),
      enabled: flag(plan.enabled, `${label}上架状态`),
      features: plan.features.map((feature) => text(feature, `${label}权益`, 200)),
      buttonText: text(plan.buttonText, `${label}按钮文字`, 40),
      buttonAction: plan.buttonAction,
      buttonUrl: plan.buttonAction === 'link' ? normalizePricingLink(plan.buttonUrl) : '',
    }
  })
  return {
    plans,
    faqs: root.faqs.map((item) => {
      const faq = record(item, '常见问题')
      return {
        id: uniqueId(faq.id, faqIds),
        question: text(faq.question, '问题', 160),
        answer: text(faq.answer, '回答', 2000),
      }
    }),
  }
}
