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
  AdminStatsData
} from '@/types'

import {
  ValidationError,
  NotFoundError,
  AuthorizationError
} from '@/types'

import type {
  AdminDashboardStats,
  AdminUserDetails,
  AdminEmailDetails,
  AdminLogDetails,
  AdminRedeemCodeDetails,
  BatchUserOperation,
  BatchEmailOperation,
  BatchRedeemCodeCreate,
  SystemHealth
} from './types'

import { DatabaseService } from '@/modules/shared/database.service'
import { generateRandomString } from '@/utils/crypto'

export class AdminService {
  private db: DatabaseService

  constructor(private env: Env) {
    this.db = new DatabaseService(env.DB)
  }

  // ==================== 仪表板统计 ====================
  
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      // 用户统计
      const userStats = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users
      `).first()

      // 临时邮箱统计
      const tempEmailStats = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive
        FROM temp_emails
      `).first()

      // 邮件统计
      const emailStats = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN DATE(received_at) = DATE('now') THEN 1 ELSE 0 END) as today,
          SUM(CASE WHEN DATE(received_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as thisWeek,
          SUM(CASE WHEN DATE(received_at) >= DATE('now', '-30 days') THEN 1 ELSE 0 END) as thisMonth
        FROM emails
      `).first()

      // 域名统计
      const domainStats = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive
        FROM domains
      `).first()

      // 兑换码统计
      const redeemCodeStats = await this.env.DB.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN used = 1 THEN 1 ELSE 0 END) as used,
          SUM(CASE WHEN used = 0 AND valid_until > datetime('now') THEN 1 ELSE 0 END) as unused,
          SUM(CASE WHEN used = 0 AND valid_until <= datetime('now') THEN 1 ELSE 0 END) as expired
        FROM redeem_codes
      `).first()

      // 配额统计
      const quotaStats = await this.env.DB.prepare(`
        SELECT 
          SUM(quota) as totalQuota,
          COUNT(*) as userCount,
          AVG(quota) as averageQuota
        FROM users
      `).first()

      const usedQuota = await this.env.DB.prepare(`
        SELECT COUNT(*) as usedQuota FROM temp_emails WHERE active = 1
      `).first()

      return {
        users: {
          total: Number(userStats?.total) || 0,
          active: Number(userStats?.active) || 0,
          inactive: Number(userStats?.inactive) || 0,
          admins: Number(userStats?.admins) || 0
        },
        tempEmails: {
          total: Number(tempEmailStats?.total) || 0,
          active: Number(tempEmailStats?.active) || 0,
          inactive: Number(tempEmailStats?.inactive) || 0
        },
        emails: {
          total: Number(emailStats?.total) || 0,
          today: Number(emailStats?.today) || 0,
          thisWeek: Number(emailStats?.thisWeek) || 0,
          thisMonth: Number(emailStats?.thisMonth) || 0
        },
        domains: {
          total: Number(domainStats?.total) || 0,
          active: Number(domainStats?.active) || 0,
          inactive: Number(domainStats?.inactive) || 0
        },
        redeemCodes: {
          total: Number(redeemCodeStats?.total) || 0,
          used: Number(redeemCodeStats?.used) || 0,
          unused: Number(redeemCodeStats?.unused) || 0,
          expired: Number(redeemCodeStats?.expired) || 0
        },
        quotaDistribution: {
          totalQuota: Number(quotaStats?.totalQuota) || 0,
          usedQuota: Number(usedQuota?.usedQuota) || 0,
          averageQuotaPerUser: Number(quotaStats?.averageQuota) || 0
        }
      }
    } catch (error) {
      console.error('获取仪表板统计失败:', error)
      throw new Error('获取仪表板统计失败')
    }
  }

  // ==================== 用户管理 ====================
  
  async getUsers(params: AdminUserListParams): Promise<PaginatedResponse<AdminUserDetails>> {
    const { page = 1, limit = 20, search, role, status } = params
    const offset = (page - 1) * limit

    let whereConditions: string[] = []
    let queryParams: any[] = []

    if (search) {
      whereConditions.push('u.email LIKE ?')
      queryParams.push(`%${search}%`)
    }

    if (role) {
      whereConditions.push('u.role = ?')
      queryParams.push(role)
    }

    if (status) {
      whereConditions.push('u.is_active = ?')
      queryParams.push(status === 'active' ? 1 : 0)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 获取用户列表
    const usersQuery = `
      SELECT 
        u.*,
        COUNT(DISTINCT te.id) as tempEmailCount,
        COUNT(DISTINCT e.id) as emailCount
      FROM users u
      LEFT JOIN temp_emails te ON u.id = te.user_id
      LEFT JOIN emails e ON te.id = e.temp_email_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `

    const users = await this.env.DB.prepare(usersQuery)
      .bind(...queryParams, limit, offset)
      .all()

    // 获取总数
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${whereClause}
    `

    const countResult = await this.env.DB.prepare(countQuery)
      .bind(...queryParams)
      .first()

    const total = Number(countResult?.total) || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: users.results as unknown as AdminUserDetails[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async getUserById(userId: number): Promise<AdminUserDetails | null> {
    const user = await this.env.DB.prepare(`
      SELECT 
        u.*,
        COUNT(DISTINCT te.id) as tempEmailCount,
        COUNT(DISTINCT e.id) as emailCount
      FROM users u
      LEFT JOIN temp_emails te ON u.id = te.user_id
      LEFT JOIN emails e ON te.id = e.temp_email_id
      WHERE u.id = ?
      GROUP BY u.id
    `).bind(userId).first()

    return user as AdminUserDetails | null
  }

  async updateUser(userId: number, updateData: AdminUserUpdateData): Promise<void> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    const updates: string[] = []
    const params: any[] = []

    if (updateData.quota !== undefined) {
      updates.push('quota = ?')
      params.push(updateData.quota)
    }

    if (updateData.is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(updateData.is_active ? 1 : 0)
    }

    if (updateData.role !== undefined) {
      updates.push('role = ?')
      params.push(updateData.role)
    }

    if (updates.length === 0) {
      return
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    params.push(userId)

    await this.env.DB.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run()
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.getUserById(userId)
    if (!user) {
      throw new NotFoundError('用户不存在')
    }

    // 删除用户相关的所有数据
    await this.env.DB.batch([
      this.env.DB.prepare('DELETE FROM emails WHERE temp_email_id IN (SELECT id FROM temp_emails WHERE user_id = ?)').bind(userId),
      this.env.DB.prepare('DELETE FROM temp_emails WHERE user_id = ?').bind(userId),
      this.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId),
      this.env.DB.prepare('DELETE FROM logs WHERE user_id = ?').bind(userId),
      this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
    ])
  }

  // ==================== 域名管理 ====================

  async getDomains(): Promise<Domain[]> {
    const domains = await this.env.DB.prepare(`
      SELECT * FROM domains ORDER BY created_at DESC
    `).all()

    return domains.results as unknown as Domain[]
  }

  async createDomain(domainData: AdminDomainCreateData): Promise<Domain> {
    const { domain, status = 1 } = domainData

    // 检查域名是否已存在
    const existingDomain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE domain = ?
    `).bind(domain).first()

    if (existingDomain) {
      throw new ValidationError('域名已存在')
    }

    const result = await this.env.DB.prepare(`
      INSERT INTO domains (domain, status, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).bind(domain, status).run()

    const newDomain = await this.env.DB.prepare(`
      SELECT * FROM domains WHERE id = ?
    `).bind(result.meta.last_row_id).first()

    return newDomain as unknown as Domain
  }

  async updateDomain(domainId: number, status: number): Promise<void> {
    const domain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE id = ?
    `).bind(domainId).first()

    if (!domain) {
      throw new NotFoundError('域名不存在')
    }

    await this.env.DB.prepare(`
      UPDATE domains SET status = ? WHERE id = ?
    `).bind(status, domainId).run()
  }

  async deleteDomain(domainId: number): Promise<void> {
    const domain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE id = ?
    `).bind(domainId).first()

    if (!domain) {
      throw new NotFoundError('域名不存在')
    }

    // 检查是否有临时邮箱使用此域名
    const tempEmailCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as count FROM temp_emails WHERE domain_id = ?
    `).bind(domainId).first()

    if (tempEmailCount && Number(tempEmailCount.count) > 0) {
      throw new ValidationError('该域名下还有临时邮箱，无法删除')
    }

    await this.env.DB.prepare(`
      DELETE FROM domains WHERE id = ?
    `).bind(domainId).run()
  }

  // ==================== 邮件审查 ====================

  async getEmails(params: AdminEmailListParams): Promise<PaginatedResponse<AdminEmailDetails>> {
    const { page = 1, limit = 20, search, sender, tempEmailId, startDate, endDate } = params
    const offset = (page - 1) * limit

    let whereConditions: string[] = []
    let queryParams: any[] = []

    if (search) {
      whereConditions.push('(e.subject LIKE ? OR e.sender LIKE ? OR te.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (sender) {
      whereConditions.push('e.sender LIKE ?')
      queryParams.push(`%${sender}%`)
    }

    if (tempEmailId) {
      whereConditions.push('e.temp_email_id = ?')
      queryParams.push(tempEmailId)
    }

    if (startDate) {
      whereConditions.push('DATE(e.received_at) >= DATE(?)')
      queryParams.push(startDate)
    }

    if (endDate) {
      whereConditions.push('DATE(e.received_at) <= DATE(?)')
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 获取邮件列表
    const emailsQuery = `
      SELECT
        e.*,
        te.email as tempEmailAddress,
        u.email as userEmail,
        d.domain as domainName
      FROM emails e
      JOIN temp_emails te ON e.temp_email_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN domains d ON te.domain_id = d.id
      ${whereClause}
      ORDER BY e.received_at DESC
      LIMIT ? OFFSET ?
    `

    const emails = await this.env.DB.prepare(emailsQuery)
      .bind(...queryParams, limit, offset)
      .all()

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM emails e
      JOIN temp_emails te ON e.temp_email_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN domains d ON te.domain_id = d.id
      ${whereClause}
    `

    const countResult = await this.env.DB.prepare(countQuery)
      .bind(...queryParams)
      .first()

    const total = Number(countResult?.total) || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: emails.results as unknown as AdminEmailDetails[],
      total,
      page,
      limit,
      totalPages
    }
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
    const { page = 1, limit = 20, search, action, userId, startDate, endDate } = params
    const offset = (page - 1) * limit

    let whereConditions: string[] = []
    let queryParams: any[] = []

    if (search) {
      whereConditions.push('(l.action LIKE ? OR l.ip_address LIKE ? OR u.email LIKE ?)')
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    if (action) {
      whereConditions.push('l.action = ?')
      queryParams.push(action)
    }

    if (userId) {
      whereConditions.push('l.user_id = ?')
      queryParams.push(userId)
    }

    if (startDate) {
      whereConditions.push('DATE(l.timestamp) >= DATE(?)')
      queryParams.push(startDate)
    }

    if (endDate) {
      whereConditions.push('DATE(l.timestamp) <= DATE(?)')
      queryParams.push(endDate)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 获取日志列表
    const logsQuery = `
      SELECT
        l.*,
        u.email as userEmail
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
      ORDER BY l.timestamp DESC
      LIMIT ? OFFSET ?
    `

    const logs = await this.env.DB.prepare(logsQuery)
      .bind(...queryParams, limit, offset)
      .all()

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
    `

    const countResult = await this.env.DB.prepare(countQuery)
      .bind(...queryParams)
      .first()

    const total = Number(countResult?.total) || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: logs.results as unknown as AdminLogDetails[],
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

  async getRedeemCodes(page: number = 1, limit: number = 20): Promise<PaginatedResponse<AdminRedeemCodeDetails>> {
    const offset = (page - 1) * limit

    // 获取兑换码列表
    const codesQuery = `
      SELECT
        r.*,
        u.email as usedByEmail
      FROM redeem_codes r
      LEFT JOIN users u ON r.used_by = u.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `

    const codes = await this.env.DB.prepare(codesQuery)
      .bind(limit, offset)
      .all()

    // 获取总数
    const countResult = await this.env.DB.prepare(`
      SELECT COUNT(*) as total FROM redeem_codes
    `).first()

    const total = Number(countResult?.total) || 0
    const totalPages = Math.ceil(total / limit)

    return {
      data: codes.results as unknown as AdminRedeemCodeDetails[],
      total,
      page,
      limit,
      totalPages
    }
  }

  async createRedeemCode(data: AdminRedeemCodeCreateData): Promise<RedeemCode> {
    const { quota, validUntil } = data
    const code = generateRandomString(12).toUpperCase()

    const result = await this.env.DB.prepare(`
      INSERT INTO redeem_codes (code, quota, valid_until, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(code, quota, validUntil).run()

    const newCode = await this.env.DB.prepare(`
      SELECT * FROM redeem_codes WHERE code = ?
    `).bind(code).first()

    return newCode as unknown as RedeemCode
  }

  async createBatchRedeemCodes(data: BatchRedeemCodeCreate): Promise<RedeemCode[]> {
    const { quota, validUntil, count, prefix = '' } = data
    const codes: RedeemCode[] = []

    for (let i = 0; i < count; i++) {
      const code = prefix + generateRandomString(12 - prefix.length).toUpperCase()

      await this.env.DB.prepare(`
        INSERT INTO redeem_codes (code, quota, valid_until, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(code, quota, validUntil).run()

      const newCode = await this.env.DB.prepare(`
        SELECT * FROM redeem_codes WHERE code = ?
      `).bind(code).first()

      if (newCode) {
        codes.push(newCode as unknown as RedeemCode)
      }
    }

    return codes
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
}