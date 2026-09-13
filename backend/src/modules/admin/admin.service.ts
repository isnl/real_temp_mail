import type {
  Env,
  User,
  TempEmail,
  Email,
  Domain,
  RedeemCode,
  OperationLog,
  PaginationParams,
  PaginatedResponse,
  AdminUserListParams,
  AdminUserUpdateData,
  AdminDomainCreateData,
  AdminEmailListParams,
  AdminLogListParams,
  AdminRedeemCodeCreateData,
  AdminRedeemCodeListParams,
  AdminStatsData,
  SystemSetting
} from '@/types'

import { DatabaseService } from '@/modules/shared/database.service'
import {
  SECRET_MASK,
  SystemSettingsService
} from '@/modules/settings/settings.service'
import { hashPassword } from '@/modules/auth/password.service'

import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/types'

import type {
  AdminDashboardStats,
  AdminUserDetails,
  AdminEmailSummary,
  AdminEmailDetails,
  AdminLogDetails,
  AdminRedeemCodeDetails,
  BatchUserOperation,
  BatchEmailOperation,
  BatchRedeemCodeCreate,
  SystemHealth,
  QuotaLogWithUser
} from './types'
import { generateRandomString } from '@/utils/crypto'

export interface AdminAuditContext {
  adminId: number
  ipAddress: string
  userAgent: string
}

export class AdminService {
  private db: DatabaseService
  private settings: SystemSettingsService

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB)
    this.settings = new SystemSettingsService(env)
  }

  // ==================== 仪表板统计 ====================
  
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const startedAt = Date.now()
    const results = await this.env.DB.batch([
      this.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
          SUM(COALESCE((
            SELECT SUM(balance.amount)
            FROM user_quota_balances balance
            WHERE balance.user_id = users.id
              AND balance.amount > 0
              AND (balance.expires_at IS NULL OR datetime(balance.expires_at) > CURRENT_TIMESTAMP)
          ), 0)) AS totalQuota,
          AVG(COALESCE((
            SELECT SUM(balance.amount)
            FROM user_quota_balances balance
            WHERE balance.user_id = users.id
              AND balance.amount > 0
              AND (balance.expires_at IS NULL OR datetime(balance.expires_at) > CURRENT_TIMESTAMP)
          ), 0)) AS averageQuota,
          SUM(CASE WHEN DATE(created_at, '+8 hours') = DATE('now', '+8 hours') THEN 1 ELSE 0 END)
            AS todayRegistrations,
          SUM(CASE WHEN DATE(created_at, '+8 hours') >= DATE('now', '+8 hours', '-7 days') THEN 1 ELSE 0 END)
            AS weekRegistrations,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM logs
            WHERE logs.user_id = users.id AND logs.action IN ('LOGIN', 'GITHUB_LOGIN')
              AND DATE(logs.timestamp, '+8 hours') = DATE('now', '+8 hours')
          ) THEN 1 ELSE 0 END) AS todayActiveUsers,
          SUM(CASE WHEN EXISTS (
            SELECT 1 FROM logs
            WHERE logs.user_id = users.id AND logs.action IN ('LOGIN', 'GITHUB_LOGIN')
              AND DATE(logs.timestamp, '+8 hours') >= DATE('now', '+8 hours', '-7 days')
          ) THEN 1 ELSE 0 END) AS weekActiveUsers
        FROM users
      `),
      this.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) AS inactive
        FROM temp_emails
      `),
      this.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN DATE(received_at, '+8 hours') = DATE('now', '+8 hours') THEN 1 ELSE 0 END) AS today,
          SUM(CASE WHEN DATE(received_at, '+8 hours') >= DATE('now', '+8 hours', '-7 days') THEN 1 ELSE 0 END) AS thisWeek,
          SUM(CASE WHEN DATE(received_at, '+8 hours') >= DATE('now', '+8 hours', '-30 days') THEN 1 ELSE 0 END) AS thisMonth
        FROM emails
        WHERE datetime(received_at) > datetime('now', '-7 days')
      `),
      this.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS inactive
        FROM domains
        WHERE deleted_at IS NULL
      `),
      this.env.DB.prepare(`
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN used_count >= max_uses THEN 1 ELSE 0 END) AS used,
          SUM(CASE WHEN used_count < max_uses AND (
            never_expires = 1 OR valid_until IS NULL OR datetime(valid_until) > CURRENT_TIMESTAMP
          ) THEN 1 ELSE 0 END) AS unused,
          SUM(CASE WHEN used_count < max_uses AND never_expires = 0
            AND valid_until IS NOT NULL AND datetime(valid_until) <= CURRENT_TIMESTAMP
          THEN 1 ELSE 0 END) AS expired
        FROM redeem_codes
      `),
      this.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END) AS totalEarned,
          SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END) AS totalConsumed,
          SUM(CASE WHEN type = 'earn' AND DATE(created_at, '+8 hours') = DATE('now', '+8 hours')
            THEN amount ELSE 0 END) AS todayEarned,
          SUM(CASE WHEN type = 'consume' AND DATE(created_at, '+8 hours') = DATE('now', '+8 hours')
            THEN amount ELSE 0 END) AS todayConsumed
        FROM quota_logs
      `)
    ])

    const row = (index: number): Record<string, unknown> =>
      (results[index]?.results?.[0] as Record<string, unknown> | undefined) ?? {}
    const value = (record: Record<string, unknown>, key: string): number =>
      Math.max(0, Number(record[key]) || 0)
    const userStats = row(0)
    const tempEmailStats = row(1)
    const emailStats = row(2)
    const domainStats = row(3)
    const redeemCodeStats = row(4)
    const quotaStats = row(5)

    return {
      users: {
        total: value(userStats, 'total'),
        active: value(userStats, 'active'),
        inactive: value(userStats, 'inactive'),
        admins: value(userStats, 'admins')
      },
      tempEmails: {
        total: value(tempEmailStats, 'total'),
        active: value(tempEmailStats, 'active'),
        inactive: value(tempEmailStats, 'inactive')
      },
      emails: {
        total: value(emailStats, 'total'),
        today: value(emailStats, 'today'),
        thisWeek: value(emailStats, 'thisWeek'),
        thisMonth: value(emailStats, 'thisMonth')
      },
      domains: {
        total: value(domainStats, 'total'),
        active: value(domainStats, 'active'),
        inactive: value(domainStats, 'inactive')
      },
      redeemCodes: {
        total: value(redeemCodeStats, 'total'),
        used: value(redeemCodeStats, 'used'),
        unused: value(redeemCodeStats, 'unused'),
        expired: value(redeemCodeStats, 'expired')
      },
      quotaDistribution: {
        totalQuota: value(userStats, 'totalQuota'),
        usedQuota: value(quotaStats, 'totalConsumed'),
        averageQuotaPerUser: value(userStats, 'averageQuota')
      },
      quotaActivity: {
        totalEarned: value(quotaStats, 'totalEarned'),
        totalConsumed: value(quotaStats, 'totalConsumed'),
        todayEarned: value(quotaStats, 'todayEarned'),
        todayConsumed: value(quotaStats, 'todayConsumed')
      },
      recentActivity: {
        todayRegistrations: value(userStats, 'todayRegistrations'),
        weekRegistrations: value(userStats, 'weekRegistrations'),
        todayActiveUsers: value(userStats, 'todayActiveUsers'),
        weekActiveUsers: value(userStats, 'weekActiveUsers')
      },
      systemHealth: {
        status: 'healthy',
        responseTime: Math.max(0, Date.now() - startedAt)
      }
    }
  }

  // ==================== 用户管理 ====================
  
  async getUsers(params: AdminUserListParams): Promise<PaginatedResponse<AdminUserDetails>> {
    const requestedPage = Number(params.page)
    const requestedLimit = Number(params.limit)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 20
    const search = params.search?.trim().slice(0, 100)
    const { role, status } = params
    const offset = (page - 1) * limit

    const whereConditions: string[] = []
    const queryParams: Array<string | number> = []

    if (search) {
      whereConditions.push('(u.email LIKE ? OR u.username LIKE ? OR u.display_name LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (role) {
      if (role !== 'user' && role !== 'admin') throw new ValidationError('用户角色无效')
      whereConditions.push('u.role = ?')
      queryParams.push(role)
    }

    if (status) {
      if (status !== 'active' && status !== 'inactive') throw new ValidationError('用户状态无效')
      whereConditions.push('u.is_active = ?')
      queryParams.push(status === 'active' ? 1 : 0)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const usersQuery = `
      SELECT
        u.id, u.email, u.username,
        COALESCE((
          SELECT SUM(balance.amount)
          FROM user_quota_balances balance
          WHERE balance.user_id = u.id AND balance.amount > 0
            AND (balance.expires_at IS NULL OR datetime(balance.expires_at) > CURRENT_TIMESTAMP)
        ), 0) AS quota,
        u.role, u.is_active,
        u.provider, u.avatar_url, u.display_name, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM temp_emails te WHERE te.user_id = u.id) AS tempEmailCount,
        (
          SELECT COUNT(*)
          FROM emails e
          JOIN temp_emails te ON te.id = e.temp_email_id
          WHERE te.user_id = u.id
            AND datetime(e.received_at) > datetime('now', '-7 days')
        ) AS emailCount
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause}
    `

    const [usersResult, countResult] = await this.env.DB.batch([
      this.env.DB.prepare(usersQuery).bind(...queryParams, limit, offset),
      this.env.DB.prepare(countQuery).bind(...queryParams)
    ])

    const countRow = countResult?.results?.[0] as { total?: number } | undefined
    const total = Math.max(0, Number(countRow?.total) || 0)
    const totalPages = Math.ceil(total / limit)

    return {
      data: (usersResult?.results ?? []) as unknown as AdminUserDetails[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async getUserById(userId: number): Promise<AdminUserDetails | null> {
    if (!Number.isSafeInteger(userId) || userId <= 0) return null
    const user = await this.env.DB.prepare(`
      SELECT
        u.id, u.email, u.username,
        COALESCE((
          SELECT SUM(balance.amount)
          FROM user_quota_balances balance
          WHERE balance.user_id = u.id AND balance.amount > 0
            AND (balance.expires_at IS NULL OR datetime(balance.expires_at) > CURRENT_TIMESTAMP)
        ), 0) AS quota,
        u.role, u.is_active,
        u.provider, u.avatar_url, u.display_name, u.created_at, u.updated_at,
        (SELECT COUNT(*) FROM temp_emails te WHERE te.user_id = u.id) AS tempEmailCount,
        (
          SELECT COUNT(*)
          FROM emails e
          JOIN temp_emails te ON te.id = e.temp_email_id
          WHERE te.user_id = u.id
            AND datetime(e.received_at) > datetime('now', '-7 days')
        ) AS emailCount
      FROM users u
      WHERE u.id = ?
    `).bind(userId).first()

    return user as AdminUserDetails | null
  }

  async updateUser(userId: number, updateData: AdminUserUpdateData, adminId: number): Promise<void> {
    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
      throw new ValidationError('请提供有效的用户更新数据')
    }
    const rawUpdate = updateData as Record<string, unknown>
    const unsupportedKeys = Object.keys(rawUpdate).filter(key => key !== 'role' && key !== 'is_active')
    if (unsupportedKeys.includes('quota')) {
      throw new ValidationError('配额只能通过专用配额调整接口修改')
    }
    if (unsupportedKeys.length > 0) throw new ValidationError('包含不支持的用户字段')
    if (rawUpdate.role !== undefined && rawUpdate.role !== 'user' && rawUpdate.role !== 'admin') {
      throw new ValidationError('用户角色无效')
    }
    if (rawUpdate.is_active !== undefined && typeof rawUpdate.is_active !== 'boolean') {
      throw new ValidationError('用户状态无效')
    }
    if (userId === adminId && (rawUpdate.role === 'user' || rawUpdate.is_active === false)) {
      throw new ValidationError('不能降权或停用当前管理员账号')
    }

    const updates: string[] = []
    const params: Array<string | number> = []

    if (rawUpdate.is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(rawUpdate.is_active ? 1 : 0)
    }

    if (rawUpdate.role !== undefined) {
      updates.push('role = ?')
      params.push(rawUpdate.role)
    }

    if (updates.length === 0) {
      const user = await this.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
      if (!user) throw new NotFoundError('用户不存在')
      return
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(userId)

    const removesActiveAdmin = rawUpdate.role === 'user' || rawUpdate.is_active === false
    const lastAdminGuard = removesActiveAdmin
      ? `AND (
          role <> 'admin' OR is_active <> 1 OR
          (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1) > 1
        )`
      : ''
    const resultingConditions: string[] = []
    const revokeParams: Array<string | number> = [userId, userId]
    if (rawUpdate.is_active !== undefined) {
      resultingConditions.push('is_active = ?')
      revokeParams.push(rawUpdate.is_active ? 1 : 0)
    }
    if (rawUpdate.role !== undefined) {
      resultingConditions.push('role = ?')
      revokeParams.push(rawUpdate.role)
    }

    const [currentResult, updateResult] = await this.env.DB.batch([
      this.env.DB.prepare('SELECT id, role, is_active FROM users WHERE id = ?').bind(userId),
      this.env.DB.prepare(`
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = ? ${lastAdminGuard}
        RETURNING id
      `).bind(...params),
      this.env.DB.prepare(`
        UPDATE refresh_tokens
        SET is_revoked = 1
        WHERE user_id = ? AND is_revoked = 0
          AND EXISTS (
            SELECT 1 FROM users
            WHERE id = ? AND ${resultingConditions.join(' AND ')}
          )
      `).bind(...revokeParams)
    ])

    if (!(currentResult?.results?.length ?? 0)) throw new NotFoundError('用户不存在')
    if (!(updateResult?.results?.length ?? 0)) {
      throw new ValidationError('系统必须保留至少一个启用的管理员')
    }
  }

  async deleteUser(userId: number, adminId: number): Promise<void> {
    if (userId === adminId) throw new ValidationError('不能删除当前登录的管理员账号')

    // Final-schema foreign keys cascade owned data (OAuth links, inboxes,
    // messages, quota and reads) and retain audit logs via ON DELETE SET NULL.
    const [currentResult, deleteResult] = await this.env.DB.batch([
      this.env.DB.prepare('SELECT id, role, is_active FROM users WHERE id = ?').bind(userId),
      this.env.DB.prepare(`
        DELETE FROM users
        WHERE id = ?
          AND (
            role <> 'admin' OR is_active <> 1 OR
            (SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1) > 1
          )
        RETURNING id
      `).bind(userId)
    ])

    if (!(currentResult?.results?.length ?? 0)) throw new NotFoundError('用户不存在')
    if (!(deleteResult?.results?.length ?? 0)) {
      throw new ValidationError('系统必须保留至少一个启用的管理员')
    }
  }

  // ==================== 域名管理 ====================

  async getDomains(): Promise<Domain[]> {
    const domains = await this.env.DB.prepare(`
      SELECT id, domain, status, created_at, deleted_at
      FROM domains
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
    `).all()

    return domains.results as unknown as Domain[]
  }

  async createDomain(domainData: AdminDomainCreateData): Promise<Domain> {
    const domain = this.normalizeDomain(domainData.domain)
    const status = domainData.status ?? 1
    if (![0, 1].includes(status)) throw new ValidationError('域名状态无效')

    const result = await this.env.DB.prepare(`
      INSERT INTO domains (domain, status, created_at, deleted_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, NULL)
      ON CONFLICT(domain) DO UPDATE SET
        status = excluded.status,
        deleted_at = NULL
      WHERE domains.deleted_at IS NOT NULL
      RETURNING id, domain, status, created_at, deleted_at
    `).bind(domain, status).first<Domain>()

    if (!result) throw new ValidationError('域名已存在')
    return result
  }

  async updateDomain(domainId: number, status: number): Promise<void> {
    if (![0, 1].includes(status)) throw new ValidationError('域名状态无效')
    const result = await this.env.DB.prepare(`
      UPDATE domains SET status = ? WHERE id = ? AND deleted_at IS NULL
    `).bind(status, domainId).run()
    if ((result.meta?.changes ?? 0) !== 1) throw new NotFoundError('域名不存在')
  }

  async deleteDomain(domainId: number): Promise<void> {
    const results = await this.env.DB.batch([
      this.env.DB.prepare(`
        UPDATE temp_emails
        SET active = 0, public_inbox_enabled = 0
        WHERE domain_id = ?
          AND EXISTS (
            SELECT 1 FROM domains
            WHERE id = ? AND deleted_at IS NULL
          )
      `).bind(domainId, domainId),
      this.env.DB.prepare(`
        UPDATE domains
        SET status = 0, deleted_at = CURRENT_TIMESTAMP
        WHERE id = ? AND deleted_at IS NULL
        RETURNING id
      `).bind(domainId)
    ])
    if (!(results[1]?.results?.length ?? 0)) throw new NotFoundError('域名不存在')
  }

  private normalizeDomain(input: string): string {
    const domain = (input || '').trim().toLowerCase().replace(/^@/, '').replace(/\.$/, '')
    if (domain.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain)) {
      throw new ValidationError('请输入有效的域名')
    }
    return domain
  }

  // ==================== 邮件审查 ====================

  async getEmails(params: AdminEmailListParams): Promise<PaginatedResponse<AdminEmailSummary>> {
    const requestedPage = Number(params.page)
    const requestedLimit = Number(params.limit)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 20
    const search = params.search?.trim().slice(0, 200)
    const sender = params.sender?.trim().slice(0, 200)
    const { tempEmailId, startDate, endDate } = params
    const offset = (page - 1) * limit

    const whereConditions: string[] = [
      "datetime(e.received_at) > datetime('now', '-7 days')"
    ]
    const queryParams: Array<string | number> = []

    if (search) {
      whereConditions.push('(e.subject LIKE ? OR e.content LIKE ? OR e.sender LIKE ? OR te.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (sender) {
      whereConditions.push('e.sender LIKE ?')
      queryParams.push(`%${sender}%`)
    }

    if (tempEmailId) {
      if (!Number.isSafeInteger(tempEmailId) || tempEmailId <= 0) {
        throw new ValidationError('临时邮箱ID无效')
      }
      whereConditions.push('e.temp_email_id = ?')
      queryParams.push(tempEmailId)
    }

    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new ValidationError('开始日期格式无效')
      whereConditions.push('datetime(e.received_at) >= datetime(?)')
      queryParams.push(startDate)
    }

    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new ValidationError('结束日期格式无效')
      whereConditions.push("datetime(e.received_at) < datetime(?, '+1 day')")
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const emailsQuery = `
      SELECT
        e.id, e.temp_email_id, e.sender, e.subject,
        substr(COALESCE(e.content, ''), 1, 240) AS content_preview,
        CASE WHEN e.verification_code IS NULL OR e.verification_code = '' THEN 0 ELSE 1 END
          AS hasVerificationCode,
        e.is_read, e.received_at,
        te.email AS tempEmailAddress,
        u.email AS userEmail,
        d.domain AS domainName
      FROM emails e
      JOIN temp_emails te ON e.temp_email_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN domains d ON te.domain_id = d.id
      ${whereClause}
      ORDER BY e.received_at DESC, e.id DESC
      LIMIT ? OFFSET ?
    `

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM emails e
      JOIN temp_emails te ON e.temp_email_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN domains d ON te.domain_id = d.id
      ${whereClause}
    `

    const [emailsResult, countResult] = await this.env.DB.batch([
      this.env.DB.prepare(emailsQuery).bind(...queryParams, limit, offset),
      this.env.DB.prepare(countQuery).bind(...queryParams)
    ])

    const countRow = countResult?.results?.[0] as { total?: number } | undefined
    const total = Math.max(0, Number(countRow?.total) || 0)
    const totalPages = Math.ceil(total / limit)

    return {
      data: (emailsResult?.results ?? []) as unknown as AdminEmailSummary[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async getEmailById(
    emailId: number,
    audit?: AdminAuditContext
  ): Promise<AdminEmailDetails | null> {
    if (!Number.isSafeInteger(emailId) || emailId <= 0) return null
    const query = this.env.DB.prepare(`
      SELECT
        e.id, e.temp_email_id, e.sender, e.subject, e.content, e.html_content,
        e.verification_code, e.is_read, e.received_at,
        te.email AS tempEmailAddress,
        u.email AS userEmail,
        d.domain AS domainName
      FROM emails e
      JOIN temp_emails te ON te.id = e.temp_email_id
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE e.id = ?
        AND datetime(e.received_at) > datetime('now', '-7 days')
    `).bind(emailId)

    if (!audit) return await query.first<AdminEmailDetails>()

    const results = await this.env.DB.batch([
      query,
      this.env.DB.prepare(`
        INSERT INTO logs (user_id, action, ip_address, user_agent, details, timestamp)
        SELECT ?, 'ADMIN_READ_EMAIL', ?, ?, ?, CURRENT_TIMESTAMP
        WHERE EXISTS (
          SELECT 1 FROM emails
          WHERE id = ? AND datetime(received_at) > datetime('now', '-7 days')
        )
      `).bind(
        audit.adminId,
        audit.ipAddress,
        audit.userAgent,
        JSON.stringify({ emailId }),
        emailId
      )
    ])
    return ((results[0]?.results ?? [])[0] as AdminEmailDetails | undefined) ?? null
  }

  async deleteEmail(emailId: number): Promise<void> {
    const email = await this.env.DB.prepare(`
      SELECT id FROM emails WHERE id = ?
    `).bind(emailId).first()

    if (!email) {
      throw new NotFoundError('邮件不存在')
    }

    await this.env.DB.prepare(`
      DELETE FROM emails WHERE id = ?
    `).bind(emailId).run()
  }

  // ==================== 日志审计 ====================

  async getLogs(params: AdminLogListParams): Promise<PaginatedResponse<AdminLogDetails>> {
    const requestedPage = Number(params.page)
    const requestedLimit = Number(params.limit)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 20
    const search = params.search?.trim().slice(0, 100)
    const action = params.action?.trim().slice(0, 100)
    const { userId, startDate, endDate } = params
    const offset = (page - 1) * limit

    const whereConditions: string[] = []
    const queryParams: Array<string | number> = []

    if (search) {
      whereConditions.push('(l.action LIKE ? OR l.ip_address LIKE ? OR u.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (action) {
      whereConditions.push('l.action = ?')
      queryParams.push(action)
    }

    if (userId) {
      if (!Number.isSafeInteger(userId) || userId <= 0) throw new ValidationError('用户ID无效')
      whereConditions.push('l.user_id = ?')
      queryParams.push(userId)
    }

    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new ValidationError('开始日期格式无效')
      whereConditions.push('DATE(l.timestamp) >= DATE(?)')
      queryParams.push(startDate)
    }

    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new ValidationError('结束日期格式无效')
      whereConditions.push('DATE(l.timestamp) <= DATE(?)')
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const logsQuery = `
      SELECT
        l.id, l.user_id, l.action, l.ip_address, l.user_agent, l.details,
        l.timestamp, u.email AS userEmail
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.timestamp DESC
      LIMIT ? OFFSET ?
    `

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
    `

    const [logsResult, countResult] = await this.env.DB.batch([
      this.env.DB.prepare(logsQuery).bind(...queryParams, limit, offset),
      this.env.DB.prepare(countQuery).bind(...queryParams)
    ])

    const countRow = countResult?.results?.[0] as { total?: number } | undefined
    const total = Math.max(0, Number(countRow?.total) || 0)
    const totalPages = Math.ceil(total / limit)

    return {
      data: (logsResult?.results ?? []) as unknown as AdminLogDetails[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async getLogActions(): Promise<string[]> {
    const actions = await this.env.DB.prepare(`
      SELECT DISTINCT action FROM logs ORDER BY action
    `).all()

    return actions.results.map((row: any) => row.action)
  }

  // ==================== 兑换码管理 ====================

  async getRedeemCodes(params: AdminRedeemCodeListParams = {}): Promise<PaginatedResponse<AdminRedeemCodeDetails>> {
    const requestedPage = Number(params.page)
    const requestedLimit = Number(params.limit)
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 20
    const search = params.search?.trim().slice(0, 100)
    const name = params.name?.trim().slice(0, 100)
    const { status, validityStatus, startDate, endDate } = params
    const offset = (page - 1) * limit

    const conditions: string[] = []
    const bindings: Array<string | number> = []

    if (search) {
      conditions.push('(r.code LIKE ? OR r.name LIKE ?)')
      bindings.push(`%${search}%`, `%${search}%`)
    }

    if (name) {
      conditions.push('r.name LIKE ?')
      bindings.push(`%${name}%`)
    }

    if (status && status !== 'all') {
      switch (status) {
        case 'unused':
          conditions.push(`r.used_count = 0 AND (
            r.never_expires = 1 OR r.valid_until IS NULL OR datetime(r.valid_until) > CURRENT_TIMESTAMP
          )`)
          break
        case 'used':
          conditions.push('r.used_count > 0')
          break
        case 'expired':
          conditions.push(`r.never_expires = 0 AND r.valid_until IS NOT NULL
            AND datetime(r.valid_until) <= CURRENT_TIMESTAMP`)
          break
        default:
          throw new ValidationError('兑换码状态无效')
      }
    }

    if (validityStatus && validityStatus !== 'all') {
      switch (validityStatus) {
        case 'valid':
          conditions.push(`(
            r.never_expires = 1 OR r.valid_until IS NULL OR datetime(r.valid_until) > CURRENT_TIMESTAMP
          )`)
          break
        case 'expired':
          conditions.push(`r.never_expires = 0 AND r.valid_until IS NOT NULL
            AND datetime(r.valid_until) <= CURRENT_TIMESTAMP`)
          break
        default:
          throw new ValidationError('兑换码有效期状态无效')
      }
    }

    if (startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) throw new ValidationError('开始日期格式无效')
      conditions.push('DATE(r.created_at) >= ?')
      bindings.push(startDate)
    }

    if (endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new ValidationError('结束日期格式无效')
      conditions.push('DATE(r.created_at) <= ?')
      bindings.push(endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const codesQuery = `
      SELECT
        r.id, r.code, r.name, r.quota, r.valid_until, r.used,
        r.used_by, r.used_at, r.created_at, r.max_uses, r.used_count,
        r.never_expires,
        u.email AS usedByEmail,
        COALESCE(usage_count.currentUses, 0) AS currentUses
      FROM redeem_codes r
      LEFT JOIN users u ON r.used_by = u.id
      LEFT JOIN (
        SELECT redeem_code_id, COUNT(*) AS currentUses
        FROM redeem_code_usages
        GROUP BY redeem_code_id
      ) usage_count ON r.id = usage_count.redeem_code_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `
    const countQuery = `SELECT COUNT(*) AS total FROM redeem_codes r ${whereClause}`
    const usagesQuery = `
      WITH page_codes AS (
        SELECT r.id
        FROM redeem_codes r
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      )
      SELECT
        rcu.redeem_code_id AS redeemCodeId,
        rcu.user_id AS userId,
        u.email AS userEmail,
        rcu.used_at AS usedAt
      FROM redeem_code_usages rcu
      JOIN page_codes page ON page.id = rcu.redeem_code_id
      JOIN users u ON u.id = rcu.user_id
      ORDER BY rcu.used_at DESC
    `

    const [codesResult, countResult, usagesResult] = await this.env.DB.batch([
      this.env.DB.prepare(codesQuery).bind(...bindings, limit, offset),
      this.env.DB.prepare(countQuery).bind(...bindings),
      this.env.DB.prepare(usagesQuery).bind(...bindings, limit, offset)
    ])
    const countRow = countResult?.results?.[0] as { total?: number } | undefined
    const total = Math.max(0, Number(countRow?.total) || 0)
    const totalPages = Math.ceil(total / limit)

    type UsageRow = { redeemCodeId: number; userId: number; userEmail: string; usedAt: string }
    const usagesByCode = new Map<number, AdminRedeemCodeDetails['usageList']>()
    for (const usage of (usagesResult?.results ?? []) as unknown as UsageRow[]) {
      const list = usagesByCode.get(Number(usage.redeemCodeId)) ?? []
      list.push({
        userId: Number(usage.userId),
        userEmail: usage.userEmail,
        usedAt: usage.usedAt
      })
      usagesByCode.set(Number(usage.redeemCodeId), list)
    }
    const enrichedCodes = ((codesResult?.results ?? []) as unknown as AdminRedeemCodeDetails[])
      .map(code => ({ ...code, usageList: usagesByCode.get(Number(code.id)) ?? [] }))

    return {
      data: enrichedCodes as AdminRedeemCodeDetails[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async createRedeemCode(data: AdminRedeemCodeCreateData): Promise<RedeemCode> {
    const codes = await this.insertRedeemCodes(data, 1, '')
    const code = codes[0]
    if (!code) throw new Error('兑换码创建失败')
    return code
  }

  async createBatchRedeemCodes(data: BatchRedeemCodeCreate): Promise<RedeemCode[]> {
    if (!Number.isSafeInteger(data.count) || data.count < 1 || data.count > 100) {
      throw new ValidationError('单次可批量创建 1-100 个兑换码')
    }
    const prefix = (data.prefix ?? '').trim().toUpperCase()
    if (!/^[A-Z0-9_-]{0,6}$/.test(prefix)) {
      throw new ValidationError('兑换码前缀最多 6 位，仅支持字母、数字、下划线和短横线')
    }
    return await this.insertRedeemCodes(data, data.count, prefix)
  }

  private async insertRedeemCodes(
    data: AdminRedeemCodeCreateData | BatchRedeemCodeCreate,
    count: number,
    prefix: string
  ): Promise<RedeemCode[]> {
    const quota = Number(data.quota)
    const maxUses = Number(data.maxUses ?? 1)
    const neverExpires = data.neverExpires === true
    const name = data.name?.trim() || null
    if (!Number.isSafeInteger(quota) || quota < 1 || quota > 10000) {
      throw new ValidationError('単个兑换码配额必须是 1-10000 的整数')
    }
    if (!Number.isSafeInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
      throw new ValidationError('最大使用次数必须是 1-10000 的整数')
    }
    if (name && name.length > 100) throw new ValidationError('兑换码名称不能超过 100 个字符')

    let validUntil: string | null = null
    if (!neverExpires) {
      const parsedExpiry = Date.parse(data.validUntil)
      if (!Number.isFinite(parsedExpiry) || parsedExpiry <= Date.now()) {
        throw new ValidationError('兑换码有效期必须是未来时间')
      }
      validUntil = new Date(parsedExpiry).toISOString()
    }

    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for (let attempt = 0; attempt < 5; attempt++) {
      const generated = new Set<string>()
      while (generated.size < count) {
        generated.add(prefix + generateRandomString(12 - prefix.length, alphabet))
      }

      try {
        const results = await this.env.DB.batch([...generated].map(code => this.env.DB.prepare(`
          INSERT INTO redeem_codes
            (code, name, quota, valid_until, max_uses, never_expires, used_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
          RETURNING id, code, name, quota, valid_until, used, used_by, used_at,
            created_at, max_uses, used_count, never_expires
        `).bind(code, name, quota, validUntil, maxUses, neverExpires ? 1 : 0)))

        return results.flatMap(result => (result.results ?? []) as unknown as RedeemCode[])
      } catch (error) {
        if (!this.db.isUniqueConstraintError(error) || attempt === 4) throw error
      }
    }

    throw new Error('兑换码生成失败')
  }

  async deleteRedeemCode(code: string): Promise<void> {
    const redeemCode = await this.env.DB.prepare(`
      SELECT code FROM redeem_codes WHERE code = ?
    `).bind(code).first()

    if (!redeemCode) {
      throw new NotFoundError('兑换码不存在')
    }

    await this.env.DB.prepare(`
      DELETE FROM redeem_codes WHERE code = ?
    `).bind(code).run()
  }

  // ==================== 系统设置管理 ====================

  async getSystemSettings(): Promise<SystemSetting[]> {
    return await this.settings.getAdminSettings()
  }

  async getSystemSetting(key: string): Promise<SystemSetting | null> {
    if (!this.settings.isKnownKey(key)) return null
    return (await this.settings.getAdminSettings()).find(setting => setting.setting_key === key) ?? null
  }

  async updateSystemSetting(
    key: string,
    value: string,
    audit?: AdminAuditContext
  ): Promise<void> {
    await this.updateSystemSettings({ [key]: value }, audit)
  }

  async updateSystemSettings(
    values: Record<string, string>,
    audit?: AdminAuditContext
  ): Promise<void> {
    const entries = Object.entries(values)
    if (entries.length === 0 || entries.length > 20) {
      throw new ValidationError('请提供 1-20 个系统设置')
    }

    const typedValues: Record<string, string> = {}
    for (const [key, value] of entries) {
      if (!this.settings.isKnownKey(key)) throw new ValidationError(`未知的系统设置: ${key}`)
      if (typeof value !== 'string') throw new ValidationError(`${key} 的值必须是字符串`)
      typedValues[key] = value
    }

    const additionalStatements: D1PreparedStatement[] = []
    const admin = await this.db.getPrimaryAdmin()
    if ('admin_username' in typedValues) {
      if (!admin) throw new NotFoundError('主管理员不存在')
      const username = this.settings.validateAndNormalize('admin_username', typedValues.admin_username ?? '')
      additionalStatements.push(this.env.DB.prepare(`
        UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(username, admin.id))
    }

    const passwordInput = typedValues.admin_password
    if (passwordInput !== undefined && passwordInput !== '' && passwordInput !== SECRET_MASK) {
      if (!admin) throw new NotFoundError('主管理员不存在')
      const password = this.settings.validateAndNormalize('admin_password', passwordInput)
      additionalStatements.push(
        this.env.DB.prepare(`
          UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).bind(await hashPassword(password), admin.id),
        this.env.DB.prepare(`
          UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0
        `).bind(admin.id)
      )
    }

    const changedKeys = Object.keys(typedValues).filter(key => {
      const value = typedValues[key]
      if (value === SECRET_MASK) return false
      return key !== 'admin_password' || Boolean(value?.trim())
    }).sort()
    if (audit && changedKeys.length > 0) {
      additionalStatements.push(this.env.DB.prepare(`
        INSERT INTO logs (user_id, action, ip_address, user_agent, details, timestamp)
        VALUES (?, 'ADMIN_UPDATE_SETTINGS', ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        audit.adminId,
        audit.ipAddress,
        audit.userAgent,
        JSON.stringify({ keys: changedKeys })
      ))
    }

    try {
      await this.settings.setValues(typedValues, additionalStatements)
    } catch (error) {
      if (this.db.isUniqueConstraintError(error)) throw new ValidationError('管理员账号已被使用')
      throw error
    }
  }

  // ==================== 配额记录管理 ====================

  async getQuotaLogs(page: number = 1, limit: number = 20, filters?: {
    userId?: number
    type?: 'earn' | 'consume'
    source?: string
    startDate?: string
    endDate?: string
  }): Promise<PaginatedResponse<QuotaLogWithUser>> {
    page = Number.isSafeInteger(page) && page > 0 ? page : 1
    limit = Number.isSafeInteger(limit) ? Math.min(100, Math.max(1, limit)) : 20
    const offset = (page - 1) * limit

    const whereConditions: string[] = []
    const params: Array<string | number> = []

    if (filters?.userId) {
      if (!Number.isSafeInteger(filters.userId) || filters.userId <= 0) {
        throw new ValidationError('用户ID无效')
      }
      whereConditions.push('q.user_id = ?')
      params.push(filters.userId)
    }

    if (filters?.type) {
      if (filters.type !== 'earn' && filters.type !== 'consume') {
        throw new ValidationError('配额记录类型无效')
      }
      whereConditions.push('q.type = ?')
      params.push(filters.type)
    }

    if (filters?.source) {
      if (!['register', 'checkin', 'redeem_code', 'admin_adjust', 'create_email'].includes(filters.source)) {
        throw new ValidationError('配额来源无效')
      }
      whereConditions.push('q.source = ?')
      params.push(filters.source)
    }

    if (filters?.startDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
        throw new ValidationError('开始日期格式无效')
      }
      whereConditions.push('datetime(q.created_at) >= datetime(?)')
      params.push(filters.startDate)
    }

    if (filters?.endDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
        throw new ValidationError('结束日期格式无效')
      }
      whereConditions.push("datetime(q.created_at) < datetime(?, '+1 day')")
      params.push(filters.endDate)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const logsQuery = `
      SELECT
        q.id, q.user_id, q.type, q.amount, q.source, q.description,
        q.related_id, q.operation_id, q.expires_at, q.quota_type, q.created_at,
        u.email AS user_email
      FROM quota_logs q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM quota_logs q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
    `

    const [logsResult, countResult] = await this.env.DB.batch([
      this.env.DB.prepare(logsQuery).bind(...params, limit, offset),
      this.env.DB.prepare(countQuery).bind(...params)
    ])

    const countRow = countResult?.results?.[0] as { total?: number } | undefined
    const total = Math.max(0, Number(countRow?.total) || 0)
    const totalPages = Math.ceil(total / limit)

    return {
      data: (logsResult?.results ?? []) as unknown as QuotaLogWithUser[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async getQuotaStats(): Promise<{
    totalEarned: number
    totalConsumed: number
    todayEarned: number
    todayConsumed: number
    sourceStats: Array<{ source: string; count: number; amount: number }>
  }> {
    const [totalStats, todayStats, sourceStats] = await this.env.DB.batch([
      this.env.DB.prepare(`
        SELECT type, SUM(amount) AS total_amount, COUNT(*) AS count
        FROM quota_logs
        GROUP BY type
      `),
      this.env.DB.prepare(`
        SELECT type, SUM(amount) AS total_amount, COUNT(*) AS count
        FROM quota_logs
        WHERE DATE(created_at, '+8 hours') = DATE('now', '+8 hours')
        GROUP BY type
      `),
      this.env.DB.prepare(`
        SELECT source, COUNT(*) AS count, SUM(amount) AS amount
        FROM quota_logs
        GROUP BY source
        ORDER BY amount DESC
      `)
    ])

    type AggregateRow = { type: string; total_amount: number }
    type SourceRow = { source: string; count: number; amount: number }
    const totalRows = (totalStats?.results ?? []) as unknown as AggregateRow[]
    const todayRows = (todayStats?.results ?? []) as unknown as AggregateRow[]
    const sourceRows = (sourceStats?.results ?? []) as unknown as SourceRow[]
    const totalEarned = totalRows.find(row => row.type === 'earn')?.total_amount ?? 0
    const totalConsumed = totalRows.find(row => row.type === 'consume')?.total_amount ?? 0
    const todayEarned = todayRows.find(row => row.type === 'earn')?.total_amount ?? 0
    const todayConsumed = todayRows.find(row => row.type === 'consume')?.total_amount ?? 0

    return {
      totalEarned: Number(totalEarned),
      totalConsumed: Number(totalConsumed),
      todayEarned: Number(todayEarned),
      todayConsumed: Number(todayConsumed),
      sourceStats: sourceRows.map(row => ({
        source: String(row.source),
        count: Math.max(0, Number(row.count) || 0),
        amount: Math.max(0, Number(row.amount) || 0)
      }))
    }
  }

  // ==================== 用户配额分配 ====================

  async allocateQuotaToUser(
    userId: number,
    amount: number,
    description: string | undefined,
    actorUserId: number
  ): Promise<void> {
    const normalizedDescription = description?.trim() || (
      amount > 0 ? '管理员增加配额（永不过期）' : '管理员扣除配额'
    )
    const result = await this.db.adjustUserQuotaAtomically({
      userId,
      actorUserId,
      amount,
      description: normalizedDescription
    })

    if (result === 'not_found') throw new NotFoundError('用户不存在')
    if (result === 'insufficient') {
      throw new ValidationError('用户可用配额不足，无法扣除指定数量')
    }
  }
}
