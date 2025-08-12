import { DatabaseService } from '@/modules/shared/database.service';
import { ValidationError, NotFoundError } from '@/types';
import { generateRandomString } from '@/utils/crypto';
export class AdminService {
    env;
    db;
    constructor(env) {
        this.env = env;
        this.db = new DatabaseService(env.DB);
    }
    // ==================== 仪表板统计 ====================
    async getDashboardStats() {
        try {
            console.log('开始获取仪表板统计数据...');
            // 用户统计
            console.log('查询用户统计...');
            const userStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
        FROM users
      `).first();
            console.log('用户统计结果:', userStats);
            // 临时邮箱统计
            console.log('查询临时邮箱统计...');
            const tempEmailStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END) as inactive
        FROM temp_emails
      `).first();
            console.log('临时邮箱统计结果:', tempEmailStats);
            // 邮件统计
            console.log('查询邮件统计...');
            const emailStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN DATE(received_at) = DATE('now', '+8 hours') THEN 1 ELSE 0 END) as today,
          SUM(CASE WHEN DATE(received_at) >= DATE('now', '+8 hours', '-7 days') THEN 1 ELSE 0 END) as thisWeek,
          SUM(CASE WHEN DATE(received_at) >= DATE('now', '+8 hours', '-30 days') THEN 1 ELSE 0 END) as thisMonth
        FROM emails
      `).first();
            console.log('邮件统计结果:', emailStats);
            // 域名统计
            console.log('查询域名统计...');
            const domainStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive
        FROM domains
      `).first();
            console.log('域名统计结果:', domainStats);
            // 兑换码统计
            console.log('查询兑换码统计...');
            const redeemCodeStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN used = 1 THEN 1 ELSE 0 END) as used,
          SUM(CASE WHEN used = 0 AND valid_until > datetime('now', '+8 hours') THEN 1 ELSE 0 END) as unused,
          SUM(CASE WHEN used = 0 AND valid_until <= datetime('now', '+8 hours') THEN 1 ELSE 0 END) as expired
        FROM redeem_codes
      `).first();
            console.log('兑换码统计结果:', redeemCodeStats);
            // 配额统计
            console.log('查询配额统计...');
            const quotaStats = await this.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END) as totalEarned,
          SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END) as totalConsumed,
          SUM(CASE WHEN type = 'earn' AND DATE(created_at) = DATE('now', '+8 hours') THEN amount ELSE 0 END) as todayEarned,
          SUM(CASE WHEN type = 'consume' AND DATE(created_at) = DATE('now', '+8 hours') THEN amount ELSE 0 END) as todayConsumed
        FROM quota_logs
      `).first();
            console.log('配额统计结果:', quotaStats);
            // 签到统计
            console.log('查询签到统计...');
            const checkinStats = await this.env.DB.prepare(`
        SELECT
          COUNT(*) as totalCheckins,
          COUNT(DISTINCT user_id) as uniqueUsers,
          SUM(CASE WHEN DATE(created_at) = DATE('now', '+8 hours') THEN 1 ELSE 0 END) as todayCheckins,
          SUM(CASE WHEN DATE(created_at) >= DATE('now', '+8 hours', '-7 days') THEN 1 ELSE 0 END) as weekCheckins
        FROM user_checkins
      `).first();
            console.log('签到统计结果:', checkinStats);
            // 系统健康状态
            const systemHealth = {
                database: {
                    status: 'healthy',
                    responseTime: 50,
                    connectionCount: 1
                },
                storage: {
                    totalEmails: Number(emailStats?.total) || 0,
                    totalSize: 0,
                    avgEmailSize: 0
                },
                performance: {
                    avgResponseTime: 50,
                    requestsPerMinute: 0,
                    errorRate: 0
                },
                rateLimits: {
                    activeRateLimits: 0,
                    blockedRequests: 0
                }
            };
            // 最近活动统计
            const recentActivity = await this.env.DB.prepare(`
        SELECT
          COUNT(CASE WHEN DATE(created_at) = DATE('now', '+8 hours') THEN 1 END) as todayRegistrations,
          COUNT(CASE WHEN DATE(created_at) >= DATE('now', '+8 hours', '-7 days') THEN 1 END) as weekRegistrations,
          COUNT(CASE WHEN DATE(updated_at) = DATE('now', '+8 hours') THEN 1 END) as todayActiveUsers,
          COUNT(CASE WHEN DATE(updated_at) >= DATE('now', '+8 hours', '-7 days') THEN 1 END) as weekActiveUsers
        FROM users
      `).first();
            // 用户配额统计
            const userQuotaStats = await this.env.DB.prepare(`
        SELECT
          SUM(quota) as totalQuota,
          COUNT(*) as userCount,
          AVG(quota) as averageQuota
        FROM users
      `).first();
            const usedQuota = await this.env.DB.prepare(`
        SELECT COUNT(*) as usedQuota FROM temp_emails WHERE active = 1
      `).first();
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
                    totalQuota: Number(userQuotaStats?.totalQuota) || 0,
                    usedQuota: Number(usedQuota?.usedQuota) || 0,
                    averageQuotaPerUser: Number(userQuotaStats?.averageQuota) || 0
                },
                quotaActivity: {
                    totalEarned: Number(quotaStats?.totalEarned) || 0,
                    totalConsumed: Number(quotaStats?.totalConsumed) || 0,
                    todayEarned: Number(quotaStats?.todayEarned) || 0,
                    todayConsumed: Number(quotaStats?.todayConsumed) || 0
                },
                checkinActivity: {
                    totalCheckins: Number(checkinStats?.totalCheckins) || 0,
                    uniqueUsers: Number(checkinStats?.uniqueUsers) || 0,
                    todayCheckins: Number(checkinStats?.todayCheckins) || 0,
                    weekCheckins: Number(checkinStats?.weekCheckins) || 0
                },
                recentActivity: {
                    todayRegistrations: Number(recentActivity?.todayRegistrations) || 0,
                    weekRegistrations: Number(recentActivity?.weekRegistrations) || 0,
                    todayActiveUsers: Number(recentActivity?.todayActiveUsers) || 0,
                    weekActiveUsers: Number(recentActivity?.weekActiveUsers) || 0
                },
                systemHealth
            };
        }
        catch (error) {
            console.error('获取仪表板统计失败:', error);
            throw new Error('获取仪表板统计失败');
        }
    }
    // ==================== 用户管理 ====================
    async getUsers(params) {
        const { page = 1, limit = 20, search, role, status } = params;
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        if (search) {
            whereConditions.push('u.email LIKE ?');
            queryParams.push(`%${search}%`);
        }
        if (role) {
            whereConditions.push('u.role = ?');
            queryParams.push(role);
        }
        if (status) {
            whereConditions.push('u.is_active = ?');
            queryParams.push(status === 'active' ? 1 : 0);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
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
    `;
        const users = await this.env.DB.prepare(usersQuery)
            .bind(...queryParams, limit, offset)
            .all();
        // 获取总数
        const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${whereClause}
    `;
        const countResult = await this.env.DB.prepare(countQuery)
            .bind(...queryParams)
            .first();
        const total = Number(countResult?.total) || 0;
        const totalPages = Math.ceil(total / limit);
        return {
            data: users.results,
            total,
            page,
            limit,
            totalPages
        };
    }
    async getUserById(userId) {
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
    `).bind(userId).first();
        return user;
    }
    async updateUser(userId, updateData) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        const updates = [];
        const params = [];
        if (updateData.quota !== undefined) {
            updates.push('quota = ?');
            params.push(updateData.quota);
        }
        if (updateData.is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(updateData.is_active ? 1 : 0);
        }
        if (updateData.role !== undefined) {
            updates.push('role = ?');
            params.push(updateData.role);
        }
        if (updates.length === 0) {
            return;
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(userId);
        await this.env.DB.prepare(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...params).run();
    }
    async deleteUser(userId) {
        const user = await this.getUserById(userId);
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        // 删除用户相关的所有数据
        await this.env.DB.batch([
            this.env.DB.prepare('DELETE FROM emails WHERE temp_email_id IN (SELECT id FROM temp_emails WHERE user_id = ?)').bind(userId),
            this.env.DB.prepare('DELETE FROM temp_emails WHERE user_id = ?').bind(userId),
            this.env.DB.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').bind(userId),
            this.env.DB.prepare('DELETE FROM logs WHERE user_id = ?').bind(userId),
            this.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId)
        ]);
    }
    // ==================== 域名管理 ====================
    async getDomains() {
        const domains = await this.env.DB.prepare(`
      SELECT * FROM domains ORDER BY created_at DESC
    `).all();
        return domains.results;
    }
    async createDomain(domainData) {
        const { domain, status = 1 } = domainData;
        // 检查域名是否已存在
        const existingDomain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE domain = ?
    `).bind(domain).first();
        if (existingDomain) {
            throw new ValidationError('域名已存在');
        }
        const result = await this.env.DB.prepare(`
      INSERT INTO domains (domain, status, created_at)
      VALUES (?, ?, datetime('now', '+8 hours'))
    `).bind(domain, status).run();
        const newDomain = await this.env.DB.prepare(`
      SELECT * FROM domains WHERE id = ?
    `).bind(result.meta.last_row_id).first();
        return newDomain;
    }
    async updateDomain(domainId, status) {
        const domain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE id = ?
    `).bind(domainId).first();
        if (!domain) {
            throw new NotFoundError('域名不存在');
        }
        await this.env.DB.prepare(`
      UPDATE domains SET status = ? WHERE id = ?
    `).bind(status, domainId).run();
    }
    async deleteDomain(domainId) {
        const domain = await this.env.DB.prepare(`
      SELECT id FROM domains WHERE id = ?
    `).bind(domainId).first();
        if (!domain) {
            throw new NotFoundError('域名不存在');
        }
        // 检查是否有临时邮箱使用此域名
        const tempEmailCount = await this.env.DB.prepare(`
      SELECT COUNT(*) as count FROM temp_emails WHERE domain_id = ?
    `).bind(domainId).first();
        if (tempEmailCount && Number(tempEmailCount.count) > 0) {
            throw new ValidationError('该域名下还有临时邮箱，无法删除');
        }
        await this.env.DB.prepare(`
      DELETE FROM domains WHERE id = ?
    `).bind(domainId).run();
    }
    // ==================== 邮件审查 ====================
    async getEmails(params) {
        const { page = 1, limit = 20, search, sender, tempEmailId, startDate, endDate } = params;
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        if (search) {
            whereConditions.push('(e.subject LIKE ? OR e.sender LIKE ? OR te.email LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (sender) {
            whereConditions.push('e.sender LIKE ?');
            queryParams.push(`%${sender}%`);
        }
        if (tempEmailId) {
            whereConditions.push('e.temp_email_id = ?');
            queryParams.push(tempEmailId);
        }
        if (startDate) {
            whereConditions.push('DATE(e.received_at) >= DATE(?)');
            queryParams.push(startDate);
        }
        if (endDate) {
            whereConditions.push('DATE(e.received_at) <= DATE(?)');
            queryParams.push(endDate);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
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
    `;
        const emails = await this.env.DB.prepare(emailsQuery)
            .bind(...queryParams, limit, offset)
            .all();
        // 获取总数
        const countQuery = `
      SELECT COUNT(*) as total
      FROM emails e
      JOIN temp_emails te ON e.temp_email_id = te.id
      JOIN users u ON te.user_id = u.id
      JOIN domains d ON te.domain_id = d.id
      ${whereClause}
    `;
        const countResult = await this.env.DB.prepare(countQuery)
            .bind(...queryParams)
            .first();
        const total = Number(countResult?.total) || 0;
        const totalPages = Math.ceil(total / limit);
        return {
            data: emails.results,
            total,
            page,
            limit,
            totalPages
        };
    }
    async deleteEmail(emailId) {
        const email = await this.env.DB.prepare(`
      SELECT id FROM emails WHERE id = ?
    `).bind(emailId).first();
        if (!email) {
            throw new NotFoundError('邮件不存在');
        }
        await this.env.DB.prepare(`
      DELETE FROM emails WHERE id = ?
    `).bind(emailId).run();
    }
    // ==================== 日志审计 ====================
    async getLogs(params) {
        const { page = 1, limit = 20, search, action, userId, startDate, endDate } = params;
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let queryParams = [];
        if (search) {
            whereConditions.push('(l.action LIKE ? OR l.ip_address LIKE ? OR u.email LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (action) {
            whereConditions.push('l.action = ?');
            queryParams.push(action);
        }
        if (userId) {
            whereConditions.push('l.user_id = ?');
            queryParams.push(userId);
        }
        if (startDate) {
            whereConditions.push('DATE(l.timestamp) >= DATE(?)');
            queryParams.push(startDate);
        }
        if (endDate) {
            whereConditions.push('DATE(l.timestamp) <= DATE(?)');
            queryParams.push(endDate);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
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
    `;
        const logs = await this.env.DB.prepare(logsQuery)
            .bind(...queryParams, limit, offset)
            .all();
        // 获取总数
        const countQuery = `
      SELECT COUNT(*) as total
      FROM logs l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereClause}
    `;
        const countResult = await this.env.DB.prepare(countQuery)
            .bind(...queryParams)
            .first();
        const total = Number(countResult?.total) || 0;
        const totalPages = Math.ceil(total / limit);
        return {
            data: logs.results,
            total,
            page,
            limit,
            totalPages
        };
    }
    async getLogActions() {
        const actions = await this.env.DB.prepare(`
      SELECT DISTINCT action FROM logs ORDER BY action
    `).all();
        return actions.results.map((row) => row.action);
    }
    // ==================== 兑换码管理 ====================
    async getRedeemCodes(params = {}) {
        const { page = 1, limit = 20, search, name, status, validityStatus, startDate, endDate } = params;
        const offset = (page - 1) * limit;
        // 构建 WHERE 条件
        const conditions = [];
        const bindings = [];
        if (search) {
            conditions.push('(r.code LIKE ? OR r.name LIKE ?)');
            bindings.push(`%${search}%`, `%${search}%`);
        }
        if (name) {
            conditions.push('r.name LIKE ?');
            bindings.push(`%${name}%`);
        }
        if (status && status !== 'all') {
            switch (status) {
                case 'unused':
                    conditions.push('r.used_count = 0 AND (r.never_expires = 1 OR r.valid_until > datetime("now", "+8 hours"))');
                    break;
                case 'used':
                    conditions.push('r.used_count > 0');
                    break;
                case 'expired':
                    conditions.push('r.never_expires = 0 AND r.valid_until <= datetime("now", "+8 hours")');
                    break;
            }
        }
        if (validityStatus && validityStatus !== 'all') {
            switch (validityStatus) {
                case 'valid':
                    conditions.push('(r.never_expires = 1 OR r.valid_until > datetime("now", "+8 hours"))');
                    break;
                case 'expired':
                    conditions.push('r.never_expires = 0 AND r.valid_until <= datetime("now", "+8 hours")');
                    break;
            }
        }
        if (startDate) {
            conditions.push('DATE(r.created_at) >= ?');
            bindings.push(startDate);
        }
        if (endDate) {
            conditions.push('DATE(r.created_at) <= ?');
            bindings.push(endDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        // 获取兑换码列表
        const codesQuery = `
      SELECT
        r.*,
        u.email as usedByEmail,
        COALESCE(usage_count.count, 0) as currentUses
      FROM redeem_codes r
      LEFT JOIN users u ON r.used_by = u.id
      LEFT JOIN (
        SELECT code, COUNT(*) as count
        FROM redeem_code_usage
        GROUP BY code
      ) usage_count ON r.code = usage_count.code
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
        const codes = await this.env.DB.prepare(codesQuery)
            .bind(...bindings, limit, offset)
            .all();
        // 获取总数
        const countQuery = `SELECT COUNT(*) as total FROM redeem_codes r ${whereClause}`;
        const countResult = await this.env.DB.prepare(countQuery)
            .bind(...bindings)
            .first();
        const total = Number(countResult?.total) || 0;
        const totalPages = Math.ceil(total / limit);
        // 为每个兑换码获取使用记录列表
        const enrichedCodes = await Promise.all(codes.results.map(async (code) => {
            const usageList = await this.env.DB.prepare(`
          SELECT
            rcu.user_id as userId,
            u.email as userEmail,
            rcu.used_at as usedAt
          FROM redeem_code_usage rcu
          JOIN users u ON rcu.user_id = u.id
          WHERE rcu.code = ?
          ORDER BY rcu.used_at DESC
        `).bind(code.code).all();
            return {
                ...code,
                usageList: usageList.results || []
            };
        }));
        return {
            data: enrichedCodes,
            total,
            page,
            limit,
            totalPages
        };
    }
    async createRedeemCode(data) {
        const { name, quota, validUntil, maxUses = 1, neverExpires = false } = data;
        const code = generateRandomString(12).toUpperCase();
        const result = await this.env.DB.prepare(`
      INSERT INTO redeem_codes (code, name, quota, valid_until, max_uses, never_expires, used_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now', '+8 hours'))
    `).bind(code, name || null, quota, validUntil, maxUses, neverExpires ? 1 : 0).run();
        const newCode = await this.env.DB.prepare(`
      SELECT * FROM redeem_codes WHERE code = ?
    `).bind(code).first();
        return newCode;
    }
    async createBatchRedeemCodes(data) {
        const { name, quota, validUntil, count, prefix = '', maxUses = 1, neverExpires = false } = data;
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = prefix + generateRandomString(12 - prefix.length).toUpperCase();
            await this.env.DB.prepare(`
        INSERT INTO redeem_codes (code, name, quota, valid_until, max_uses, never_expires, used_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now', '+8 hours'))
      `).bind(code, name || null, quota, validUntil, maxUses, neverExpires ? 1 : 0).run();
            const newCode = await this.env.DB.prepare(`
        SELECT * FROM redeem_codes WHERE code = ?
      `).bind(code).first();
            if (newCode) {
                codes.push(newCode);
            }
        }
        return codes;
    }
    async deleteRedeemCode(code) {
        const redeemCode = await this.env.DB.prepare(`
      SELECT code FROM redeem_codes WHERE code = ?
    `).bind(code).first();
        if (!redeemCode) {
            throw new NotFoundError('兑换码不存在');
        }
        await this.env.DB.prepare(`
      DELETE FROM redeem_codes WHERE code = ?
    `).bind(code).run();
    }
    // ==================== 系统设置管理 ====================
    async getSystemSettings() {
        const settings = await this.env.DB.prepare(`
      SELECT * FROM system_settings ORDER BY setting_key
    `).all();
        return settings.results;
    }
    async getSystemSetting(key) {
        return await this.env.DB.prepare(`
      SELECT * FROM system_settings WHERE setting_key = ?
    `).bind(key).first();
    }
    async updateSystemSetting(key, value) {
        const setting = await this.getSystemSetting(key);
        if (!setting) {
            throw new NotFoundError('系统设置不存在');
        }
        await this.env.DB.prepare(`
      UPDATE system_settings
      SET setting_value = ?, updated_at = datetime('now', '+8 hours')
      WHERE setting_key = ?
    `).bind(value, key).run();
    }
    // ==================== 配额记录管理 ====================
    async getQuotaLogs(page = 1, limit = 20, filters) {
        const offset = (page - 1) * limit;
        let whereConditions = [];
        let params = [];
        if (filters?.userId) {
            whereConditions.push('q.user_id = ?');
            params.push(filters.userId);
        }
        if (filters?.type) {
            whereConditions.push('q.type = ?');
            params.push(filters.type);
        }
        if (filters?.source) {
            whereConditions.push('q.source = ?');
            params.push(filters.source);
        }
        if (filters?.startDate) {
            whereConditions.push('q.created_at >= ?');
            params.push(filters.startDate);
        }
        if (filters?.endDate) {
            whereConditions.push('q.created_at <= ?');
            params.push(filters.endDate);
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        // 获取配额记录列表
        const logsQuery = `
      SELECT
        q.*,
        u.email as user_email
      FROM quota_logs q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `;
        const logs = await this.env.DB.prepare(logsQuery)
            .bind(...params, limit, offset)
            .all();
        // 获取总数
        const countQuery = `
      SELECT COUNT(*) as total
      FROM quota_logs q
      LEFT JOIN users u ON q.user_id = u.id
      ${whereClause}
    `;
        const countResult = await this.env.DB.prepare(countQuery)
            .bind(...params)
            .first();
        const total = Number(countResult?.total) || 0;
        const totalPages = Math.ceil(total / limit);
        return {
            data: logs.results,
            total,
            page,
            limit,
            totalPages
        };
    }
    async getQuotaStats() {
        // 总获得和消费
        const totalStats = await this.env.DB.prepare(`
      SELECT
        type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM quota_logs
      GROUP BY type
    `).all();
        // 今日获得和消费
        const todayStats = await this.env.DB.prepare(`
      SELECT
        type,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM quota_logs
      WHERE DATE(created_at) = DATE('now', '+8 hours')
      GROUP BY type
    `).all();
        // 来源统计
        const sourceStats = await this.env.DB.prepare(`
      SELECT
        source,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM quota_logs
      GROUP BY source
      ORDER BY amount DESC
    `).all();
        const totalEarned = totalStats.results?.find((s) => s.type === 'earn')?.total_amount || 0;
        const totalConsumed = totalStats.results?.find((s) => s.type === 'consume')?.total_amount || 0;
        const todayEarned = todayStats.results?.find((s) => s.type === 'earn')?.total_amount || 0;
        const todayConsumed = todayStats.results?.find((s) => s.type === 'consume')?.total_amount || 0;
        return {
            totalEarned: Number(totalEarned),
            totalConsumed: Number(totalConsumed),
            todayEarned: Number(todayEarned),
            todayConsumed: Number(todayConsumed),
            sourceStats: sourceStats.results || []
        };
    }
    // ==================== 用户配额分配 ====================
    async allocateQuotaToUser(userId, amount, description) {
        // 1. 检查用户是否存在
        const user = await this.env.DB.prepare(`
      SELECT id, quota FROM users WHERE id = ?
    `).bind(userId).first();
        if (!user) {
            throw new NotFoundError('用户不存在');
        }
        // 2. 如果是负数，需要检查是否有足够的配额可以扣除
        if (amount < 0) {
            const dbService = new DatabaseService(this.env.DB);
            const totalQuota = await dbService.getUserTotalQuota(userId);
            if (totalQuota.available + amount < 0) {
                throw new ValidationError('用户可用配额不足，无法扣除指定数量');
            }
            // 扣除配额（使用消费逻辑）
            const success = await dbService.consumeQuota(userId, Math.abs(amount));
            if (!success) {
                throw new ValidationError('配额扣除失败');
            }
            // 更新用户剩余配额
            const newTotalQuota = await dbService.getUserTotalQuota(userId);
            await this.env.DB.prepare(`
        UPDATE users SET quota = ? WHERE id = ?
      `).bind(newTotalQuota.available, userId).run();
        }
        else {
            // 3. 增加配额（创建永久配额余额）
            const dbService = new DatabaseService(this.env.DB);
            await dbService.createQuotaBalance({
                userId,
                quotaType: 'permanent',
                amount,
                expiresAt: null, // 永不过期
                source: 'admin_adjust',
                sourceId: null
            });
            // 更新用户剩余配额
            const totalQuota = await dbService.getUserTotalQuota(userId);
            await this.env.DB.prepare(`
        UPDATE users SET quota = ? WHERE id = ?
      `).bind(totalQuota.available, userId).run();
        }
        // 4. 创建配额记录
        const dbService = new DatabaseService(this.env.DB);
        await dbService.createQuotaLog({
            userId,
            type: amount > 0 ? 'earn' : 'consume',
            amount: Math.abs(amount),
            source: 'admin_adjust',
            description: description || (amount > 0 ? '管理员增加配额（永不过期）' : '管理员扣除配额'),
            expiresAt: amount > 0 ? null : undefined, // 增加的配额永不过期
            quotaType: amount > 0 ? 'permanent' : undefined
        });
        // 5. 记录操作日志
        await dbService.createLog({
            userId,
            action: 'ADMIN_QUOTA_ADJUST',
            details: `Admin adjusted quota by ${amount}, description: ${description || 'N/A'}`
        });
    }
}
