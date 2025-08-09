// 环境变量类型
export interface Env {
  DB: D1Database
  JWT_SECRET: string
  BASE_DOMAIN: string
  ENVIRONMENT: 'development' | 'production'
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
}

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

export interface CreateUserData {
  email: string
  password_hash: string
  quota?: number
  role?: 'user' | 'admin'
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

// 系统设置类型
export interface SystemSetting {
  id: number
  setting_key: string
  setting_value: string
  description: string | null
  created_at: string
  updated_at: string
}

// 用户签到记录类型
export interface UserCheckin {
  id: number
  user_id: number
  checkin_date: string
  quota_reward: number
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
}

// 签到请求类型
export interface CheckinRequest {
  // 签到不需要额外参数
}

// 签到响应类型
export interface CheckinResponse {
  success: boolean
  quota_reward: number
  total_quota: number
  message: string
}

// 域名类型
export interface Domain {
  id: number
  domain: string
  status: number
  created_at: string
}

// 兑换码类型
export interface RedeemCode {
  code: string
  quota: number
  valid_until: string
  used: boolean
  used_by: number | null
  used_at: string | null
  created_at: string
  max_uses: number
}

// 兑换码使用记录类型
export interface RedeemCodeUsage {
  id: number
  code: string
  user_id: number
  used_at: string
}

// JWT相关类型
export interface JWTPayload {
  userId: number
  email: string
  role: 'user' | 'admin'
  type: 'access' | 'refresh'
  iat: number
  exp: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface RefreshToken {
  id: number
  user_id: number
  token_hash: string
  expires_at: string
  created_at: string
  is_revoked: boolean
}

// 认证请求类型
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload
}

// API请求/响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface LoginRequest {
  email: string
  password: string
  turnstileToken?: string
}

export interface RegisterRequest {
  email: string
  password: string
  confirmPassword: string
  turnstileToken?: string
}

export interface CreateEmailRequest {
  domainId: number
}

export interface RedeemRequest {
  code: string
  turnstileToken?: string
}

// 分页类型
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

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

// 限流类型
export interface RateLimit {
  id: number
  identifier: string
  endpoint: string
  request_count: number
  window_start: string
}

export interface RateLimitRule {
  endpoint: string
  windowMs: number
  maxRequests: number
  requireAuth: boolean
}

// 邮件解析类型
export interface ParsedEmail {
  from: {
    address: string
    name?: string
  }
  to: string
  subject: string
  text: string
  html: string
  verificationCode?: string
}

// 错误类型
export class AppError extends Error {
  constructor(
    public override message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '认证失败') {
    super(message, 401, 'AUTH_ERROR')
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR')
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super(message, 404, 'NOT_FOUND_ERROR')
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '请求过于频繁') {
    super(message, 429, 'RATE_LIMIT_ERROR')
  }
}



// 管理员相关类型
export interface AdminUserListParams {
  page?: number
  limit?: number
  search?: string
  role?: 'user' | 'admin'
  status?: 'active' | 'inactive'
}

export interface AdminUserUpdateData {
  quota?: number
  is_active?: boolean
  role?: 'user' | 'admin'
}

export interface AdminDomainCreateData {
  domain: string
  status?: number
}

export interface AdminEmailListParams {
  page?: number
  limit?: number
  search?: string
  sender?: string
  tempEmailId?: number
  startDate?: string
  endDate?: string
}

export interface AdminLogListParams {
  page?: number
  limit?: number
  search?: string
  action?: string
  userId?: number
  startDate?: string
  endDate?: string
}

export interface AdminRedeemCodeCreateData {
  quota: number
  validUntil: string
  count?: number
  maxUses?: number
}

export interface AdminStatsData {
  totalUsers: number
  activeUsers: number
  totalTempEmails: number
  activeTempEmails: number
  totalEmails: number
  totalDomains: number
  activeDomains: number
  totalRedeemCodes: number
  usedRedeemCodes: number
}

// 公告相关类型
export interface Announcement {
  id: number
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateAnnouncementData {
  title: string
  content: string
  is_active?: boolean
}

export interface UpdateAnnouncementData {
  title?: string
  content?: string
  is_active?: boolean
}

export interface AdminAnnouncementListParams {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive'
}
