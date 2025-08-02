// 用户相关类型
export interface User {
  id: number
  email: string
  role: 'user' | 'admin'
  quota: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// 临时邮箱类型
export interface TempEmail {
  id: number
  userId: number
  email: string
  domainId: number
  createdAt: string
  active: boolean
}

// 邮件类型
export interface Email {
  id: number
  tempEmailId: number
  sender: string
  subject: string
  content: string
  receivedAt: string
  verificationCode?: string
}

// 域名类型
export interface Domain {
  id: number
  domain: string
  status: number // 0=禁用 1=启用
}

// 兑换码类型
export interface RedeemCode {
  code: string
  quota: number
  validUntil: string
  used: boolean
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
  turnstileToken: string
}

export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  turnstileToken: string
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
  userId: number
  action: string
  ipAddress: string
  userAgent: string
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
  turnstileToken: string
}

// 兑换码使用请求
export interface RedeemRequest {
  code: string
  turnstileToken: string
}
