export class DatabaseService {
    db;
    constructor(db) {
        this.db = db;
    }
    // 用户相关操作
    async createUser(userData) {
        const result = await this.db.prepare(`
      INSERT INTO users (email, password_hash, quota, role)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `).bind(userData.email, userData.password_hash, userData.quota || 5, userData.role || 'user').first();
        if (!result) {
            throw new Error('Failed to create user');
        }
        return result;
    }
    async getUserByEmail(email) {
        return await this.db.prepare(`
      SELECT * FROM users WHERE email = ? AND is_active = 1
    `).bind(email).first();
    }
    async getUserById(id) {
        return await this.db.prepare(`
      SELECT * FROM users WHERE id = ? AND is_active = 1
    `).bind(id).first();
    }
    async updateUserQuota(userId, quota) {
        await this.db.prepare(`
      UPDATE users SET quota = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?
    `).bind(quota, userId).run();
    }
    async decrementUserQuota(userId) {
        const result = await this.db.prepare(`
      UPDATE users SET quota = quota - 1, updated_at = datetime('now', '+8 hours')
      WHERE id = ? AND quota > 0
    `).bind(userId).run();
        return (result.meta?.changes ?? 0) > 0;
    }
    async updateUserPassword(userId, passwordHash) {
        const result = await this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?
    `).bind(passwordHash, userId).run();
        return (result.meta?.changes ?? 0) > 0;
    }
    // 临时邮箱相关操作
    async createTempEmail(userId, email, domainId) {
        const result = await this.db.prepare(`
      INSERT INTO temp_emails (user_id, email, domain_id)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(userId, email, domainId).first();
        if (!result) {
            throw new Error('Failed to create temp email');
        }
        return result;
    }
    async getTempEmailsByUserId(userId) {
        const result = await this.db.prepare(`
      SELECT * FROM temp_emails 
      WHERE user_id = ? AND active = 1 
      ORDER BY created_at DESC
    `).bind(userId).all();
        return result.results || [];
    }
    async getTempEmailByEmail(email) {
        return await this.db.prepare(`
      SELECT * FROM temp_emails WHERE email = ? AND active = 1
    `).bind(email).first();
    }
    async deleteTempEmail(id, userId) {
        const result = await this.db.prepare(`
      UPDATE temp_emails SET active = 0 WHERE id = ? AND user_id = ?
    `).bind(id, userId).run();
        return (result.meta?.changes ?? 0) > 0;
    }
    // 邮件相关操作
    async createEmail(emailData) {
        const result = await this.db.prepare(`
      INSERT INTO emails (temp_email_id, sender, subject, content, html_content, verification_code)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(emailData.tempEmailId, emailData.sender, emailData.subject || null, emailData.content || null, emailData.htmlContent || null, emailData.verificationCode || null).first();
        if (!result) {
            throw new Error('Failed to create email');
        }
        return result;
    }
    async getEmailsForTempEmail(tempEmailId, pagination) {
        // 获取总数
        const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM emails WHERE temp_email_id = ?
    `).bind(tempEmailId).first();
        const total = countResult?.total || 0;
        // 获取分页数据
        const result = await this.db.prepare(`
      SELECT * FROM emails 
      WHERE temp_email_id = ? 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `).bind(tempEmailId, pagination.limit, pagination.offset).all();
        return {
            data: result.results || [],
            total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: Math.ceil(total / pagination.limit)
        };
    }
    async getEmailById(id) {
        return await this.db.prepare(`
      SELECT * FROM emails WHERE id = ?
    `).bind(id).first();
    }
    async deleteEmail(id) {
        const result = await this.db.prepare(`
      DELETE FROM emails WHERE id = ?
    `).bind(id).run();
        return (result.meta?.changes ?? 0) > 0;
    }
    // 域名相关操作
    async getActiveDomains() {
        const result = await this.db.prepare(`
      SELECT * FROM domains WHERE status = 1 ORDER BY domain
    `).bind().all();
        return result.results || [];
    }
    async getDomainById(id) {
        return await this.db.prepare(`
      SELECT * FROM domains WHERE id = ?
    `).bind(id).first();
    }
    // 兑换码相关操作
    async getRedeemCode(code) {
        return await this.db.prepare(`
      SELECT * FROM redeem_codes WHERE code = ?
    `).bind(code).first();
    }
    async useRedeemCode(code, userId) {
        // 检查用户是否已经使用过这个兑换码
        const existingUsage = await this.db.prepare(`
      SELECT id FROM redeem_code_usage WHERE code = ? AND user_id = ?
    `).bind(code, userId).first();
        if (existingUsage) {
            return false; // 用户已经使用过这个兑换码
        }
        // 检查兑换码是否还有可用次数
        const redeemCode = await this.getRedeemCode(code);
        if (!redeemCode) {
            return false;
        }
        // 检查当前使用次数
        const currentUsesResult = await this.db.prepare(`
      SELECT COUNT(*) as count FROM redeem_code_usage WHERE code = ?
    `).bind(code).first();
        const currentUses = Number(currentUsesResult?.count) || 0;
        if (currentUses >= redeemCode.max_uses) {
            return false; // 已达到最大使用次数
        }
        // 检查兑换码是否过期
        if (new Date(redeemCode.valid_until) < new Date()) {
            return false;
        }
        // 添加使用记录
        const result = await this.db.prepare(`
      INSERT INTO redeem_code_usage (code, user_id)
      VALUES (?, ?)
    `).bind(code, userId).run();
        // 如果这是第一次使用，更新兑换码的used字段（保持向后兼容）
        if (currentUses === 0) {
            await this.db.prepare(`
        UPDATE redeem_codes
        SET used = 1, used_by = ?, used_at = datetime('now', '+8 hours')
        WHERE code = ?
      `).bind(userId, code).run();
        }
        return (result.meta?.changes ?? 0) > 0;
    }
    // 检查用户是否已使用过兑换码
    async hasUserUsedRedeemCode(code, userId) {
        const result = await this.db.prepare(`
      SELECT id FROM redeem_code_usage WHERE code = ? AND user_id = ?
    `).bind(code, userId).first();
        return !!result;
    }
    // 获取兑换码的使用次数
    async getRedeemCodeUsageCount(code) {
        const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM redeem_code_usage WHERE code = ?
    `).bind(code).first();
        return Number(result?.count) || 0;
    }
    // 获取兑换码的使用记录
    async getRedeemCodeUsageList(code) {
        const result = await this.db.prepare(`
      SELECT
        rcu.user_id as userId,
        u.email as userEmail,
        rcu.used_at as usedAt
      FROM redeem_code_usage rcu
      JOIN users u ON rcu.user_id = u.id
      WHERE rcu.code = ?
      ORDER BY rcu.used_at DESC
    `).bind(code).all();
        return result.results || [];
    }
    // 刷新令牌相关操作
    async storeRefreshToken(userId, tokenHash, expiresAt) {
        await this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(userId, tokenHash, expiresAt).run();
    }
    async getRefreshToken(tokenHash) {
        return await this.db.prepare(`
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND is_revoked = 0 AND expires_at > datetime('now', '+8 hours')
    `).bind(tokenHash).first();
    }
    async revokeRefreshToken(tokenHash) {
        await this.db.prepare(`
      UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?
    `).bind(tokenHash).run();
    }
    // 日志相关操作
    async createLog(logData) {
        await this.db.prepare(`
      INSERT INTO logs (user_id, action, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?)
    `).bind(logData.userId || null, logData.action, logData.ipAddress || null, logData.userAgent || null, logData.details || null).run();
    }
    // ==================== 系统设置相关操作 ====================
    async getSystemSetting(key) {
        return await this.db.prepare(`
      SELECT * FROM system_settings WHERE setting_key = ?
    `).bind(key).first();
    }
    async updateSystemSetting(key, value) {
        await this.db.prepare(`
      UPDATE system_settings
      SET setting_value = ?, updated_at = datetime('now', '+8 hours')
      WHERE setting_key = ?
    `).bind(value, key).run();
    }
    // ==================== 签到相关操作 ====================
    async getTodayCheckin(userId) {
        // 使用北京时间（UTC+8）获取今天的日期
        const now = new Date();
        const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = beijingTime.toISOString().split('T')[0]; // YYYY-MM-DD格式
        return await this.db.prepare(`
      SELECT * FROM user_checkins
      WHERE user_id = ? AND checkin_date = ?
    `).bind(userId, today).first();
    }
    async createCheckin(userId, quotaReward) {
        // 使用北京时间（UTC+8）获取今天的日期
        const now = new Date();
        const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const today = beijingTime.toISOString().split('T')[0];
        const result = await this.db.prepare(`
      INSERT INTO user_checkins (user_id, checkin_date, quota_reward)
      VALUES (?, ?, ?)
      RETURNING *
    `).bind(userId, today, quotaReward).first();
        if (!result) {
            throw new Error('Failed to create checkin record');
        }
        return result;
    }
    async getUserCheckinHistory(userId, limit = 30) {
        return await this.db.prepare(`
      SELECT * FROM user_checkins
      WHERE user_id = ?
      ORDER BY checkin_date DESC
      LIMIT ?
    `).bind(userId, limit).all().then(result => result.results || []);
    }
    // ==================== 配额记录相关操作 ====================
    async createQuotaLog(data) {
        const result = await this.db.prepare(`
      INSERT INTO quota_logs (user_id, type, amount, source, description, related_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(data.userId, data.type, data.amount, data.source, data.description || null, data.relatedId || null).first();
        if (!result) {
            throw new Error('Failed to create quota log');
        }
        return result;
    }
    async getUserQuotaLogs(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        // 获取记录
        const logs = await this.db.prepare(`
      SELECT * FROM quota_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all().then(result => result.results || []);
        // 获取总数
        const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM quota_logs WHERE user_id = ?
    `).bind(userId).first();
        return {
            logs,
            total: countResult?.total || 0
        };
    }
    // 基于 quota_logs 计算用户已使用的配额
    async getUsedQuotaFromLogs(userId) {
        const result = await this.db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'consume' THEN amount ELSE 0 END), 0) as consumed
      FROM quota_logs
      WHERE user_id = ?
    `).bind(userId).first();
        return result?.consumed || 0;
    }
    // 限流相关操作
    async getRateLimit(identifier, endpoint, windowMs) {
        const windowMinutes = Math.ceil(windowMs / (60 * 1000));
        return await this.db.prepare(`
      SELECT * FROM rate_limits
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+${windowMinutes} minutes') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).first();
    }
    async createOrUpdateRateLimit(identifier, endpoint, windowMs) {
        const windowMinutes = Math.ceil(windowMs / (60 * 1000));
        // 尝试更新现有记录
        const updateResult = await this.db.prepare(`
      UPDATE rate_limits
      SET request_count = request_count + 1
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+${windowMinutes} minutes') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).run();
        if ((updateResult.meta?.changes ?? 0) > 0) {
            // 获取更新后的计数
            const result = await this.getRateLimit(identifier, endpoint, windowMs);
            return result?.request_count || 1;
        }
        else {
            // 创建新记录
            await this.db.prepare(`
        INSERT INTO rate_limits (identifier, endpoint, request_count)
        VALUES (?, ?, 1)
      `).bind(identifier, endpoint).run();
            return 1;
        }
    }
}
