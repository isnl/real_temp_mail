// 用户相关类型
export interface User {
  id: number
  username?: string
  email: string
  quota: number
  role: 'user' | 'admin'
  is_active: boolean
  provider?: 'email' | 'github'
  avatar_url?: string | null
  display_name?: string | null
  created_at: string
  updated_at: string
}

// 临时邮箱类型
export interface TempEmail {
  id: number
  user_id: number
  email: string
  domain_id: number
  created_at: string
  active: boolean
  public_inbox_enabled: boolean
}

// 邮件展示字段。公开收件箱只返回这些非所有者字段，避免泄露内部归属和已读状态。
export interface EmailMessage {
  id: number
  sender: string
  subject: string | null
  content: string | null
  html_content?: string | null
  preview?: string | null
  content_preview?: string | null
  verification_code: string | null
  is_read?: boolean
  received_at: string
}

// 登录用户自己的邮件类型
export interface Email extends EmailMessage {
  temp_email_id: number
  html_content: string | null
  is_read: boolean
}

export interface PublicEmailSummary extends EmailMessage {
  content_preview: string | null
}

export interface PublicEmailDetail extends PublicEmailSummary {
  html_content: string | null
}

// 域名类型
export interface Domain {
  id: number
  domain: string
  status: number
  created_at: string
}

// 配额记录类型
export interface QuotaLog {
  id: number
  user_id: number
  type: 'earn' | 'consume'
  amount: number
  source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email'
  description: string | null
  related_id: number | null
  created_at: string
  expires_at: string | null // 配额过期时间，NULL表示永不过期
  quota_type: 'permanent' | 'daily' | 'custom' // 配额类型
}

export interface QuotaLogsResponse {
  logs: QuotaLog[]
  total: number
}

// 兑换码类型
export interface RedeemCode {
  code: string
  name?: string // 新增：兑换码名称（可选）
  quota: number
  valid_until: string
  used: boolean
  used_by: number | null
  used_at: string | null
  created_at: string
  max_uses: number
  never_expires: boolean // 是否永不过期
}

// 用户配额余额类型
export interface UserQuotaBalance {
  id: number
  user_id: number
  quota_type: 'permanent' | 'daily' | 'custom'
  amount: number
  expires_at: string | null // NULL表示永不过期
  source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust'
  source_id: number | null
  created_at: string
  updated_at: string
}

// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 认证相关类型
export interface LoginRequest {
  account: string
  // 兼容仍按 email 字段读取的旧后端；新页面始终同时发送 account。
  email?: string
  password: string
  turnstileToken?: string
}

export interface RegisterRequest {
  username?: string
  email: string
  password: string
  confirmPassword: string
  turnstileToken?: string
}

export interface PublicSystemSettings {
  siteName: string
  contactEmail: string
  pricing: PricingContent
  registrationEnabled: boolean
  githubEnabled: boolean
  turnstileEnabled: boolean
  turnstileSiteKey: string
  turnstileLoginEnabled: boolean
  turnstileRegisterEnabled: boolean
  turnstileRedeemEnabled: boolean
  turnstilePublicInboxEnabled: boolean
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  tokens: TokenPair
}

// 分页类型
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 主题类型
export type ThemeMode = 'light' | 'dark' | 'auto'

// 操作日志类型
export interface OperationLog {
  id: number
  user_id: number | null
  action: string
  ip_address: string | null
  user_agent: string | null
  details: string | null
  timestamp: string
}

// 表单验证规则类型
export interface ValidationRule {
  required?: boolean
  message: string
  trigger?: string
  validator?: (rule: unknown, value: unknown, callback: (error?: Error) => void) => void
}

// 邮件创建请求
export interface CreateEmailRequest {
  domainId: number
}

// 邮件创建响应
export interface CreateEmailResponse {
  tempEmail: TempEmail
  userQuota: number
}

// 更新公开收件箱状态请求
export interface UpdateTempEmailPublicInboxRequest {
  publicInboxEnabled: boolean
}

// 公开收件箱请求
export interface PublicInboxRequest {
  email: string
  turnstileToken?: string
  publicAccessToken?: string
  page?: number
  limit?: number
}

// 公开收件箱响应
export interface PublicInboxResponse {
  tempEmail: {
    email: string
    created_at: string
    public_inbox_enabled: boolean
  }
  emails: PaginatedResponse<PublicEmailSummary>
  publicAccessToken: string
  publicAccessTokenExpiresAt: string
}

// 兑换码使用请求
export interface RedeemRequest {
  code: string
  turnstileToken?: string
}

// 全局类型声明
declare global {
  interface Window {
    toastui?: {
      Editor: unknown
    }
  }
}

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: string
  originalPrice: string
  quota: number
  bonusQuota: number
  popular: boolean
  enabled: boolean
  features: string[]
  buttonText: string
  buttonAction: 'text' | 'link'
  buttonUrl: string
}

export interface PricingFaq {
  id: string
  question: string
  answer: string
}

export interface PricingContent {
  plans: PricingPlan[]
  faqs: PricingFaq[]
}
