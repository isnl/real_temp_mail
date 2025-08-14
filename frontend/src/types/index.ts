// 用户相关类型
export interface User {
  id: number
  email: string
  password_hash: string
  quota: number
  role: 'user' | 'admin'
  is_active: boolean
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
}

// 邮件类型
export interface Email {
  id: number
  temp_email_id: number
  sender: string
  subject: string | null
  content: string | null
  html_content: string | null
  verification_code: string | null
  is_read: boolean
  received_at: string
}

// 域名类型
export interface Domain {
  id: number
  domain: string
  status: number
  created_at: string
}

// 签到相关类型
export interface CheckinRequest {
  // 签到不需要额外参数
}

export interface CheckinResponse {
  success: boolean
  quota_reward: number
  total_quota: number
  message: string
}

export interface CheckinStatus {
  hasCheckedIn: boolean
  checkinRecord?: {
    id: number
    user_id: number
    checkin_date: string
    quota_reward: number
    created_at: string
  }
  nextCheckinTime?: string
}

export interface CheckinHistory {
  id: number
  user_id: number
  checkin_date: string
  quota_reward: number
  created_at: string
}

export interface CheckinStats {
  totalCheckins: number
  currentStreak: number
  longestStreak: number
  thisMonthCheckins: number
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
  name?: string                   // 新增：兑换码名称（可选）
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
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 认证相关类型
export interface LoginRequest {
  email: string
  password: string
  turnstileToken?: string
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
  validator?: (rule: any, value: any, callback: any) => void
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

// 兑换码使用请求
export interface RedeemRequest {
  code: string
  turnstileToken?: string
}

// 全局类型声明
declare global {
  interface Window {
    toastui?: {
      Editor: any
    }
  }
}
