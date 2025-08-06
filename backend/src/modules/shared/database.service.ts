import type {
  Env,
  User,
  TempEmail,
  Email,
  Domain,
  RedeemCode,
  RefreshToken,
  OperationLog,
  RateLimit,
  CreateUserData,
  PaginationParams,
  PaginatedResponse,
  SystemSetting,
  UserCheckin,
  QuotaLog
} from '@/types'

export class DatabaseService {
  constructor(private db: D1Database) {}

  // 用户相关操作
  async createUser(userData: CreateUserData): Promise<User> {
    const result = await this.db.prepare(`
      INSERT INTO users (email, password_hash, quota, role)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `).bind(
      userData.email,
      userData.password_hash,
      userData.quota || 5,
      userData.role || 'user'
    ).first<User>()

    if (!result) {
      throw new Error('Failed to create user')
    }

    return result
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.db.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first<User>()
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.db.prepare(`
      SELECT * FROM users WHERE id = ? AND is_active = 1
    `).bind(id).first<User>()
  }

  async updateUserQuota(userId: number, quota: number): Promise<void> {
    await this.db.prepare(`
      UPDATE users SET quota = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?
    `).bind(quota, userId).run()
  }

  async decrementUserQuota(userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE users SET quota = quota - 1, updated_at = datetime('now', '+8 hours')
      WHERE id = ? AND quota > 0
    `).bind(userId).run()

    return (result.meta?.changes ?? 0) > 0
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?
    `).bind(passwordHash, userId).run()

    return (result.meta?.changes ?? 0) > 0
  }

  // 临时邮箱相关操作
  async createTempEmail(userId: number, email: string, domainId: number): Promise<TempEmail> {
    const result = await this.db.prepare(`
      INSERT INTO temp_emails (user_id, email, domain_id)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(userId, email, domainId).first<TempEmail>()

    if (!result) {
      throw new Error('Failed to create temp email')
    }

    return result
  }

  async getTempEmailsByUserId(userId: number): Promise<TempEmail[]> {
    const result = await this.db.prepare(`
      SELECT * FROM temp_emails 
      WHERE user_id = ? AND active = 1 
      ORDER BY created_at DESC
    `).bind(userId).all<TempEmail>()

    return result.results || []
  }

  async getTempEmailByEmail(email: string): Promise<TempEmail | null> {
    return await this.db.prepare(`
      SELECT * FROM temp_emails WHERE email = ? AND active = 1
    `).bind(email).first<TempEmail>()
  }

  async deleteTempEmail(id: number, userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE temp_emails SET active = 0 WHERE id = ? AND user_id = ?
    `).bind(id, userId).run()

    return (result.meta?.changes ?? 0) > 0
  }

  // 邮件相关操作
  async createEmail(emailData: {
    tempEmailId: number
    sender: string
    subject?: string
    content?: string
    htmlContent?: string
    verificationCode?: string
  }): Promise<Email> {
    const result = await this.db.prepare(`
      INSERT INTO emails (temp_email_id, sender, subject, content, html_content, verification_code)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      emailData.tempEmailId,
      emailData.sender,
      emailData.subject || null,
      emailData.content || null,
      emailData.htmlContent || null,
      emailData.verificationCode || null
    ).first<Email>()

    if (!result) {
      throw new Error('Failed to create email')
    }

    return result
  }

  async getEmailsForTempEmail(
    tempEmailId: number, 
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Email>> {
    // 获取总数
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM emails WHERE temp_email_id = ?
    `).bind(tempEmailId).first<{ total: number }>()

    const total = countResult?.total || 0

    // 获取分页数据
    const result = await this.db.prepare(`
      SELECT * FROM emails 
      WHERE temp_email_id = ? 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `).bind(tempEmailId, pagination.limit, pagination.offset).all<Email>()

    return {
      data: result.results || [],
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    }
  }

  async deleteEmail(id: number): Promise<boolean> {
    const result = await this.db.prepare(`
      DELETE FROM emails WHERE id = ?
    `).bind(id).run()

    return (result.meta?.changes ?? 0) > 0
  }

  // 域名相关操作
  async getActiveDomains(): Promise<Domain[]> {
    const result = await this.db.prepare(`
      SELECT * FROM domains WHERE status = 1 ORDER BY domain
    `).bind().all<Domain>()

    return result.results || []
  }

  async getDomainById(id: number): Promise<Domain | null> {
    return await this.db.prepare(`
      SELECT * FROM domains WHERE id = ?
    `).bind(id).first<Domain>()
  }

  // 兑换码相关操作
  async getRedeemCode(code: string): Promise<RedeemCode | null> {
    return await this.db.prepare(`
      SELECT * FROM redeem_codes WHERE code = ?
    `).bind(code).first<RedeemCode>()
  }

  async useRedeemCode(code: string, userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE redeem_codes
      SET used = 1, used_by = ?, used_at = datetime('now', '+8 hours')
      WHERE code = ? AND used = 0 AND valid_until > datetime('now', '+8 hours')
    `).bind(userId, code).run()

    return (result.meta?.changes ?? 0) > 0
  }

  // 刷新令牌相关操作
  async storeRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run()
  }

  async getRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return await this.db.prepare(`
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND is_revoked = 0 AND expires_at > datetime('now', '+8 hours')
    `).bind(tokenHash).first<RefreshToken>()
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.db.prepare(`
      UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?
    `).bind(tokenHash).run()
  }

  // 日志相关操作
  async createLog(logData: {
    userId?: number
    action: string
    ipAddress?: string
    userAgent?: string
    details?: string
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO logs (user_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      logData.userId || null,
      logData.action,
      logData.ipAddress || null,
      logData.userAgent || null,
      logData.details || null
    ).run()
  }

  // ==================== 系统设置相关操作 ====================

  async getSystemSetting(key: string): Promise<SystemSetting | null> {
    return await this.db.prepare(`
      SELECT * FROM system_settings WHERE setting_key = ?
    `).bind(key).first<SystemSetting>()
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    await this.db.prepare(`
      UPDATE system_settings
      SET setting_value = ?, updated_at = datetime('now', '+8 hours')
      WHERE setting_key = ?
    `).bind(value, key).run()
  }

  // ==================== 签到相关操作 ====================

  async getTodayCheckin(userId: number): Promise<UserCheckin | null> {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD格式
    return await this.db.prepare(`
      SELECT * FROM user_checkins
      WHERE user_id = ? AND checkin_date = ?
    `).bind(userId, today).first<UserCheckin>()
  }

  async createCheckin(userId: number, quotaReward: number): Promise<UserCheckin> {
    const today = new Date().toISOString().split('T')[0]

    const result = await this.db.prepare(`
      INSERT INTO user_checkins (user_id, checkin_date, quota_reward)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(userId, today, quotaReward).first<UserCheckin>()

    if (!result) {
      throw new Error('Failed to create checkin record')
    }

    return result
  }

  async getUserCheckinHistory(userId: number, limit: number = 30): Promise<UserCheckin[]> {
    return await this.db.prepare(`
      SELECT * FROM user_checkins
      WHERE user_id = ?
      ORDER BY checkin_date DESC
      LIMIT ?
    `).bind(userId, limit).all<UserCheckin>().then(result => result.results || [])
  }

  // ==================== 配额记录相关操作 ====================

  async createQuotaLog(data: {
    userId: number
    type: 'earn' | 'consume'
    amount: number
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email'
    description?: string
    relatedId?: number
  }): Promise<QuotaLog> {
    const result = await this.db.prepare(`
      INSERT INTO quota_logs (user_id, type, amount, source, description, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.userId,
      data.type,
      data.amount,
      data.source,
      data.description || null,
      data.relatedId || null
    ).first<QuotaLog>()

    if (!result) {
      throw new Error('Failed to create quota log')
    }

    return result
  }

  async getUserQuotaLogs(userId: number, page: number = 1, limit: number = 20): Promise<{
    logs: QuotaLog[]
    total: number
  }> {
    const offset = (page - 1) * limit

    // 获取记录
    const logs = await this.db.prepare(`
      SELECT * FROM quota_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all<QuotaLog>().then(result => result.results || [])

    // 获取总数
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM quota_logs WHERE user_id = ?
    `).bind(userId).first<{ total: number }>()

    return {
      logs,
      total: countResult?.total || 0
    }
  }

  // 基于 quota_logs 计算用户已使用的配额
  async getUsedQuotaFromLogs(userId: number): Promise<number> {
    const result = await this.db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END), 0) as consumed
      FROM quota_logs
      WHERE user_id = ?
    `).bind(userId).first<{ consumed: number }>()

    return result?.consumed || 0
  }

  // 限流相关操作
  async getRateLimit(identifier: string, endpoint: string): Promise<RateLimit | null> {
    return await this.db.prepare(`
      SELECT * FROM rate_limits
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+1 hour') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).first<RateLimit>()
  }

  async createOrUpdateRateLimit(identifier: string, endpoint: string): Promise<number> {
    // 尝试更新现有记录
    const updateResult = await this.db.prepare(`
      UPDATE rate_limits
      SET request_count = request_count + 1
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+1 hour') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).run()

    if ((updateResult.meta?.changes ?? 0) > 0) {
      // 获取更新后的计数
      const result = await this.getRateLimit(identifier, endpoint)
      return result?.request_count || 1
    } else {
      // 创建新记录
      await this.db.prepare(`
        INSERT INTO rate_limits (identifier, endpoint, request_count)
        VALUES (?, ?, 1)
      `).bind(identifier, endpoint).run()
      return 1
    }
  }
}
