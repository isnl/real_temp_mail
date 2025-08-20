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
  QuotaLog,
  UserQuotaBalance
} from '@/types'

export class DatabaseService {
  constructor(private db: D1Database) {}

  // 用户相关操作
  async createUser(userData: CreateUserData): Promise<User> {
    const result = await this.db.prepare(`
      INSERT INTO users (email, password_hash, quota, role, provider, provider_id, avatar_url, display_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      userData.email,
      userData.password_hash || null,
      userData.quota || 5,
      userData.role || 'user',
      userData.provider || 'email',
      userData.provider_id || null,
      userData.avatar_url || null,
      userData.display_name || null
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

  async getUserByProvider(provider: string, providerId: string): Promise<User | null> {
    return await this.db.prepare(`
      SELECT * FROM users WHERE provider = ? AND provider_id = ? AND is_active = 1
    `).bind(provider, providerId).first<User>()
  }

  async updateUser(userId: number, updates: Partial<CreateUserData>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.email !== undefined) {
      fields.push('email = ?')
      values.push(updates.email)
    }
    if (updates.password_hash !== undefined) {
      fields.push('password_hash = ?')
      values.push(updates.password_hash)
    }
    if (updates.provider !== undefined) {
      fields.push('provider = ?')
      values.push(updates.provider)
    }
    if (updates.provider_id !== undefined) {
      fields.push('provider_id = ?')
      values.push(updates.provider_id)
    }
    if (updates.avatar_url !== undefined) {
      fields.push('avatar_url = ?')
      values.push(updates.avatar_url)
    }
    if (updates.display_name !== undefined) {
      fields.push('display_name = ?')
      values.push(updates.display_name)
    }

    if (fields.length === 0) {
      return // 没有需要更新的字段
    }

    fields.push('updated_at = datetime(\'now\', \'+8 hours\')')
    values.push(userId)

    await this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run()
  }

  async updateUserQuota(userId: number, quota: number): Promise<void> {
    await this.db.prepare(`
      UPDATE users SET quota = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?
    `).bind(quota, userId).run()
  }

  async decrementUserQuota(userId: number): Promise<boolean> {
    // 使用新的配额消费逻辑
    const success = await this.consumeQuota(userId, 1)

    if (success) {
      // 同时更新 users 表的 quota 字段（保持向后兼容）
      const totalQuota = await this.getUserTotalQuota(userId)
      await this.db.prepare(`
        UPDATE users SET quota = ?, updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).bind(totalQuota.available, userId).run()
    }

    return success
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

  async getEmailById(id: number): Promise<Email | null> {
    return await this.db.prepare(`
      SELECT * FROM emails WHERE id = ?
    `).bind(id).first<Email>()
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
    // 检查用户是否已经使用过这个兑换码
    const existingUsage = await this.db.prepare(`
      SELECT id FROM redeem_code_usage WHERE code = ? AND user_id = ?
    `).bind(code, userId).first()

    if (existingUsage) {
      return false // 用户已经使用过这个兑换码
    }

    // 检查兑换码是否还有可用次数
    const redeemCode = await this.getRedeemCode(code)
    if (!redeemCode) {
      return false
    }

    // 检查当前使用次数
    const currentUsesResult = await this.db.prepare(`
      SELECT COUNT(*) as count FROM redeem_code_usage WHERE code = ?
    `).bind(code).first()

    const currentUses = Number(currentUsesResult?.count) || 0

    if (currentUses >= redeemCode.max_uses) {
      return false // 已达到最大使用次数
    }

    // 检查兑换码是否过期（如果不是永不过期）
    if (!redeemCode.never_expires && new Date(redeemCode.valid_until) < new Date()) {
      return false
    }

    // 添加使用记录
    const result = await this.db.prepare(`
      INSERT INTO redeem_code_usage (code, user_id)
      VALUES (?, ?)
    `).bind(code, userId).run()

    // 如果这是第一次使用，更新兑换码的used字段（保持向后兼容）
    if (currentUses === 0) {
      await this.db.prepare(`
        UPDATE redeem_codes
        SET used = 1, used_by = ?, used_at = datetime('now', '+8 hours')
        WHERE code = ?
      `).bind(userId, code).run()
    }

    return (result.meta?.changes ?? 0) > 0
  }

  // 检查用户是否已使用过兑换码
  async hasUserUsedRedeemCode(code: string, userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT id FROM redeem_code_usage WHERE code = ? AND user_id = ?
    `).bind(code, userId).first()

    return !!result
  }

  // 获取兑换码的使用次数
  async getRedeemCodeUsageCount(code: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM redeem_code_usage WHERE code = ?
    `).bind(code).first()

    return Number(result?.count) || 0
  }

  // 获取兑换码的使用记录
  async getRedeemCodeUsageList(code: string): Promise<Array<{userId: number, userEmail: string, usedAt: string}>> {
    const result = await this.db.prepare(`
      SELECT
        rcu.user_id as userId,
        u.email as userEmail,
        rcu.used_at as usedAt
      FROM redeem_code_usage rcu
      JOIN users u ON rcu.user_id = u.id
      WHERE rcu.code = ?
      ORDER BY rcu.used_at DESC
    `).bind(code).all()

    return result.results as Array<{userId: number, userEmail: string, usedAt: string}> || []
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

  // 带请求信息的日志记录方法
  async createLogWithRequest(request: Request, logData: {
    userId?: number
    action: string
    details?: string
  }): Promise<void> {
    const ipAddress = request.headers.get('CF-Connecting-IP') ||
                     request.headers.get('X-Forwarded-For') ||
                     request.headers.get('X-Real-IP') ||
                     'unknown'

    const userAgent = request.headers.get('User-Agent') || 'unknown'

    await this.createLog({
      ...logData,
      ipAddress,
      userAgent
    })
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
    // 使用北京时间（UTC+8）获取今天的日期
    const now = new Date()
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const today = beijingTime.toISOString().split('T')[0] // YYYY-MM-DD格式
    return await this.db.prepare(`
      SELECT * FROM user_checkins
      WHERE user_id = ? AND checkin_date = ?
    `).bind(userId, today).first<UserCheckin>()
  }

  async createCheckin(userId: number, quotaReward: number): Promise<UserCheckin> {
    // 使用北京时间（UTC+8）获取今天的日期
    const now = new Date()
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const today = beijingTime.toISOString().split('T')[0]

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
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email' | 'ad_reward'
    description?: string
    relatedId?: number
    expiresAt?: string | null
    quotaType?: 'permanent' | 'daily' | 'custom'
  }): Promise<QuotaLog> {
    const result = await this.db.prepare(`
      INSERT INTO quota_logs (user_id, type, amount, source, description, related_id, expires_at, quota_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.userId,
      data.type,
      data.amount,
      data.source,
      data.description || null,
      data.relatedId || null,
      data.expiresAt || null,
      data.quotaType || 'permanent'
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

  // ==================== 配额余额相关操作 ====================

  // 创建配额余额记录
  async createQuotaBalance(data: {
    userId: number
    quotaType: 'permanent' | 'daily' | 'custom'
    amount: number
    expiresAt?: string | null
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'ad_reward'
    sourceId?: number | null
  }): Promise<UserQuotaBalance> {
    const result = await this.db.prepare(`
      INSERT INTO user_quota_balances (user_id, quota_type, amount, expires_at, source, source_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.userId,
      data.quotaType,
      data.amount,
      data.expiresAt || null,
      data.source,
      data.sourceId || null
    ).first<UserQuotaBalance>()

    if (!result) {
      throw new Error('Failed to create quota balance')
    }

    return result
  }

  // 获取用户有效配额余额（按过期时间排序，即将过期的在前）
  async getUserQuotaBalances(userId: number): Promise<UserQuotaBalance[]> {
    const now = new Date().toISOString()

    return await this.db.prepare(`
      SELECT * FROM user_quota_balances
      WHERE user_id = ?
        AND amount > 0
        AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY
        CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
        expires_at ASC
    `).bind(userId, now).all<UserQuotaBalance>().then(result => result.results || [])
  }

  // 获取用户总配额（包括已过期的）
  async getUserTotalQuota(userId: number): Promise<{
    total: number
    available: number
    expired: number
  }> {
    const now = new Date().toISOString()

    const result = await this.db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN expires_at IS NULL OR expires_at > ? THEN amount ELSE 0 END), 0) as available,
        COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= ? THEN amount ELSE 0 END), 0) as expired
      FROM user_quota_balances
      WHERE user_id = ?
    `).bind(now, now, userId).first<{
      total: number
      available: number
      expired: number
    }>()

    return result || { total: 0, available: 0, expired: 0 }
  }

  // 消费配额（优先消费即将过期的配额）
  async consumeQuota(userId: number, amount: number): Promise<boolean> {
    const balances = await this.getUserQuotaBalances(userId)

    let remainingToConsume = amount
    const consumedBalances: { id: number, consumed: number }[] = []

    // 按过期时间优先消费配额
    for (const balance of balances) {
      if (remainingToConsume <= 0) break

      const consumeFromThis = Math.min(balance.amount, remainingToConsume)
      consumedBalances.push({ id: balance.id, consumed: consumeFromThis })
      remainingToConsume -= consumeFromThis
    }

    // 如果配额不足
    if (remainingToConsume > 0) {
      return false
    }

    // 更新配额余额
    for (const { id, consumed } of consumedBalances) {
      await this.db.prepare(`
        UPDATE user_quota_balances
        SET amount = amount - ?, updated_at = datetime('now', '+8 hours')
        WHERE id = ?
      `).bind(consumed, id).run()
    }

    return true
  }

  // 清理过期配额
  async cleanupExpiredQuotas(): Promise<number> {
    const now = new Date().toISOString()

    const result = await this.db.prepare(`
      DELETE FROM user_quota_balances
      WHERE expires_at IS NOT NULL AND expires_at <= ?
    `).bind(now).run()

    // 同时更新用户表中的配额字段
    await this.db.prepare(`
      UPDATE users SET quota = (
        SELECT COALESCE(SUM(amount), 0)
        FROM user_quota_balances
        WHERE user_quota_balances.user_id = users.id
          AND (expires_at IS NULL OR expires_at > ?)
      )
    `).bind(now).run()

    return result.meta?.changes || 0
  }

  // 获取即将过期的配额（24小时内过期）
  async getExpiringQuotas(userId?: number): Promise<UserQuotaBalance[]> {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const nowISO = now.toISOString()

    let query = `
      SELECT * FROM user_quota_balances
      WHERE expires_at IS NOT NULL
        AND expires_at > ?
        AND expires_at <= ?
        AND amount > 0
    `
    const params = [nowISO, tomorrow]

    if (userId) {
      query += ` AND user_id = ?`
      params.push(userId.toString())
    }

    query += ` ORDER BY expires_at ASC`

    return await this.db.prepare(query).bind(...params).all<UserQuotaBalance>().then(result => result.results || [])
  }

  // 限流相关操作
  async getRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<RateLimit | null> {
    const windowMinutes = Math.ceil(windowMs / (60 * 1000))
    return await this.db.prepare(`
      SELECT * FROM rate_limits
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+${windowMinutes} minutes') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).first<RateLimit>()
  }

  async createOrUpdateRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<number> {
    const windowMinutes = Math.ceil(windowMs / (60 * 1000))

    // 尝试更新现有记录
    const updateResult = await this.db.prepare(`
      UPDATE rate_limits
      SET request_count = request_count + 1
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+${windowMinutes} minutes') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).run()

    if ((updateResult.meta?.changes ?? 0) > 0) {
      // 获取更新后的计数
      const result = await this.getRateLimit(identifier, endpoint, windowMs)
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
