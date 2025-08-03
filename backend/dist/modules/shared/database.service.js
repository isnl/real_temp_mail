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
        const result = await this.db.prepare(`
      UPDATE redeem_codes
      SET used = 1, used_by = ?, used_at = datetime('now', '+8 hours')
      WHERE code = ? AND used = 0 AND valid_until > datetime('now', '+8 hours')
    `).bind(userId, code).run();
        return (result.meta?.changes ?? 0) > 0;
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
    // 限流相关操作
    async getRateLimit(identifier, endpoint) {
        return await this.db.prepare(`
      SELECT * FROM rate_limits
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+1 hour') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).first();
    }
    async createOrUpdateRateLimit(identifier, endpoint) {
        // 尝试更新现有记录
        const updateResult = await this.db.prepare(`
      UPDATE rate_limits
      SET request_count = request_count + 1
      WHERE identifier = ? AND endpoint = ?
      AND datetime(window_start, '+1 hour') > datetime('now', '+8 hours')
    `).bind(identifier, endpoint).run();
        if ((updateResult.meta?.changes ?? 0) > 0) {
            // 获取更新后的计数
            const result = await this.getRateLimit(identifier, endpoint);
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
