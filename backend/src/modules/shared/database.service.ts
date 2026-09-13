import type {
  Env,
  User,
  TempEmail,
  Email,
  Domain,
  RedeemCode,
  OperationLog,
  RateLimit,
  CreateUserData,
  PaginationParams,
  PaginatedResponse,
  PublicEmailDetail,
  PublicEmailSummary,
  SystemSetting,
  QuotaLog,
  UserQuotaBalance
} from '@/types'

export class DatabaseService {
  constructor(private db: D1Database) {}

  private readonly userColumns = `
    id, email, username, password_hash, quota, role, is_active,
    provider, provider_id, avatar_url, display_name, created_at, updated_at
  `

  /**
   * `users.quota` is retained as a compatibility cache, but expiring grants
   * make it unsuitable for reads. Every user-facing read derives quota from
   * the active balance rows instead.
   */
  private userReadColumns(alias: string): string {
    const prefix = `${alias}.`
    return `
      ${prefix}id, ${prefix}email, ${prefix}username, ${prefix}password_hash,
      COALESCE((
        SELECT SUM(balance.amount)
        FROM user_quota_balances balance
        WHERE balance.user_id = ${prefix}id
          AND balance.amount > 0
          AND (balance.expires_at IS NULL OR datetime(balance.expires_at) > CURRENT_TIMESTAMP)
      ), 0) AS quota,
      ${prefix}role, ${prefix}is_active, ${prefix}provider, ${prefix}provider_id,
      ${prefix}avatar_url, ${prefix}display_name, ${prefix}created_at, ${prefix}updated_at
    `
  }

  isUniqueConstraintError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    return /UNIQUE constraint failed|constraint failed.*unique/i.test(message)
  }

  // 用户相关操作
  async createUser(userData: CreateUserData): Promise<User> {
    const result = await this.db.prepare(`
      INSERT INTO users (
        email, username, password_hash, quota, role, provider, provider_id,
        avatar_url, display_name, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING ${this.userColumns}
    `).bind(
      userData.email.trim().toLowerCase(),
      userData.username ?? null,
      userData.password_hash ?? null,
      userData.quota ?? 5,
      userData.role ?? 'user',
      userData.provider ?? 'email',
      userData.provider_id ?? null,
      userData.avatar_url ?? null,
      userData.display_name ?? null
    ).first<User>()

    if (!result) {
      throw new Error('Failed to create user')
    }

    return result
  }

  async createRegisteredUser(data: {
    email: string
    username: string | null
    passwordHash: string
    quota: number
  }): Promise<User> {
    const statements: D1PreparedStatement[] = [
      this.db.prepare(`
        INSERT INTO users (
          email, username, password_hash, quota, role, provider, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, 'user', 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(data.email, data.username, data.passwordHash, data.quota)
    ]

    if (data.quota > 0) {
      statements.push(
        this.db.prepare(`
          INSERT INTO user_quota_balances
            (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
          SELECT id, 'permanent', ?, NULL, 'register', NULL,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM users WHERE email = ? COLLATE NOCASE
        `).bind(data.quota, data.email),
        this.db.prepare(`
          INSERT INTO quota_logs
            (user_id, type, amount, source, description, expires_at, quota_type, created_at)
          SELECT id, 'earn', ?, 'register', '注册奖励配额', NULL, 'permanent',
            CURRENT_TIMESTAMP
          FROM users WHERE email = ? COLLATE NOCASE
        `).bind(data.quota, data.email)
      )
    }

    await this.db.batch(statements)
    const user = await this.getUserByEmail(data.email, true)
    if (!user) throw new Error('Failed to create user')
    return user
  }

  async getUserByEmail(email: string, includeInactive = false): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userReadColumns('u')} FROM users u
      WHERE u.email = ? COLLATE NOCASE ${includeInactive ? '' : 'AND u.is_active = 1'}
      LIMIT 1
    `).bind(email.trim().toLowerCase()).first<User>()
  }

  async getUserByUsername(username: string, includeInactive = false): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userReadColumns('u')} FROM users u
      WHERE u.username = ? COLLATE NOCASE ${includeInactive ? '' : 'AND u.is_active = 1'}
      LIMIT 1
    `).bind(username.trim().toLowerCase()).first<User>()
  }

  async getUserByAccount(account: string): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userReadColumns('u')} FROM users u
      WHERE u.email = ? COLLATE NOCASE OR u.username = ? COLLATE NOCASE
      LIMIT 1
    `).bind(account, account).first<User>()
  }

  async getUserById(id: number): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userReadColumns('u')} FROM users u
      WHERE u.id = ? AND u.is_active = 1
    `).bind(id).first<User>()
  }

  async getAuthPrincipalById(
    id: number
  ): Promise<Pick<User, 'id' | 'email' | 'role' | 'is_active'> | null> {
    return await this.db.prepare(`
      SELECT id, email, role, is_active
      FROM users
      WHERE id = ?
      LIMIT 1
    `).bind(id).first<Pick<User, 'id' | 'email' | 'role' | 'is_active'>>()
  }

  async getUserByProvider(provider: string, providerId: string, includeInactive = false): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userReadColumns('u')}
      FROM oauth_accounts oa
      JOIN users u ON u.id = oa.user_id
      WHERE oa.provider = ? AND oa.provider_user_id = ?
        ${includeInactive ? '' : 'AND u.is_active = 1'}
      LIMIT 1
    `).bind(provider, providerId).first<User>()
  }

  async updateUser(userId: number, updates: Partial<CreateUserData>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []

    if (updates.email !== undefined) {
      fields.push('email = ?')
      values.push(updates.email)
    }
    if (updates.username !== undefined) {
      fields.push('username = ?')
      values.push(updates.username)
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

    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(userId)

    await this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `).bind(...values).run()
  }

  async updateUserQuota(userId: number, quota: number): Promise<void> {
    await this.db.prepare(`
      UPDATE users SET quota = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(quota, userId).run()
  }

  async decrementUserQuota(userId: number): Promise<boolean> {
    return await this.consumeQuota(userId, 1)
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(passwordHash, userId).run()

    return (result.meta?.changes ?? 0) > 0
  }

  async updateUserPasswordAndRevokeTokens(userId: number, passwordHash: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(`
        UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(passwordHash, userId),
      this.db.prepare(`
        UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0
      `).bind(userId)
    ])
  }

  async isAdminSetupRequired(): Promise<boolean> {
    const admin = await this.db.prepare(`
      SELECT password_hash FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    `).first<{ password_hash: string | null }>()
    return !admin?.password_hash
  }

  async bootstrapPrimaryAdmin(data: {
    username: string
    email?: string
    passwordHash: string
  }): Promise<User | null> {
    const current = await this.db.prepare(`
      SELECT id, email FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    `).first<{ id: number; email: string }>()

    if (current) {
      const result = await this.db.prepare(`
        UPDATE users
        SET username = ?, email = ?, password_hash = ?, is_active = 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND (password_hash IS NULL OR password_hash = '')
      `).bind(data.username, data.email ?? current.email, data.passwordHash, current.id).run()
      if ((result.meta?.changes ?? 0) !== 1) return null
      return await this.getUserByAccount(data.username)
    }

    const result = await this.db.prepare(`
      INSERT INTO users (
        username, email, password_hash, quota, role, is_active, provider,
        created_at, updated_at
      )
      SELECT ?, ?, ?, 0, 'admin', 1, 'email', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
      RETURNING ${this.userColumns}
    `).bind(data.username, data.email ?? 'admin@localhost.invalid', data.passwordHash).first<User>()
    return result ?? null
  }

  async getPrimaryAdmin(): Promise<User | null> {
    return await this.db.prepare(`
      SELECT ${this.userColumns} FROM users WHERE role = 'admin' ORDER BY id LIMIT 1
    `).first<User>()
  }

  async updatePrimaryAdminUsername(username: string): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE users SET username = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
    `).bind(username).run()
    if ((result.meta?.changes ?? 0) !== 1) throw new Error('Primary administrator does not exist')
  }

  async updatePrimaryAdminPassword(passwordHash: string): Promise<void> {
    const admin = await this.getPrimaryAdmin()
    if (!admin) throw new Error('Primary administrator does not exist')
    await this.updateUserPasswordAndRevokeTokens(admin.id, passwordHash)
  }

  async linkOAuthAccount(data: {
    userId: number
    provider: 'github'
    providerUserId: string
    providerEmail: string
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO oauth_accounts (
        user_id, provider, provider_user_id, provider_email, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(provider, provider_user_id) DO UPDATE SET
        provider_email = excluded.provider_email,
        updated_at = CURRENT_TIMESTAMP
    `).bind(data.userId, data.provider, data.providerUserId, data.providerEmail).run()
  }

  async createOAuthUserWithQuota(data: {
    email: string
    provider: 'github'
    providerUserId: string
    avatarUrl: string | null
    displayName: string
    quota: number
  }): Promise<User> {
    const statements: D1PreparedStatement[] = [
      this.db.prepare(`
        INSERT INTO users
          (email, password_hash, quota, role, provider, provider_id, avatar_url,
            display_name, created_at, updated_at)
        VALUES (?, '', ?, 'user', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(
        data.email,
        data.quota,
        data.provider,
        data.providerUserId,
        data.avatarUrl,
        data.displayName
      ),
      this.db.prepare(`
        INSERT INTO oauth_accounts (
          user_id, provider, provider_user_id, provider_email, created_at, updated_at
        )
        SELECT id, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM users WHERE email = ? COLLATE NOCASE
      `).bind(data.provider, data.providerUserId, data.email, data.email)
    ]

    if (data.quota > 0) {
      statements.push(
        this.db.prepare(`
          INSERT INTO user_quota_balances
            (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
          SELECT id, 'permanent', ?, NULL, 'register', NULL,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM users WHERE email = ? COLLATE NOCASE
        `).bind(data.quota, data.email),
        this.db.prepare(`
          INSERT INTO quota_logs
            (user_id, type, amount, source, description, expires_at, quota_type, created_at)
          SELECT id, 'earn', ?, 'register', 'GitHub 注册奖励配额', NULL, 'permanent',
            CURRENT_TIMESTAMP
          FROM users WHERE email = ? COLLATE NOCASE
        `).bind(data.quota, data.email)
      )
    }

    await this.db.batch(statements)
    const user = await this.getUserByProvider(data.provider, data.providerUserId)
    if (!user) throw new Error('Failed to create OAuth user')
    return user
  }

  // 临时邮箱相关操作
  async createTempEmail(userId: number, email: string, domainId: number): Promise<TempEmail> {
    const result = await this.db.prepare(`
      INSERT INTO temp_emails (user_id, email, domain_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id, user_id, email, domain_id, created_at, active, public_inbox_enabled
    `).bind(userId, email, domainId).first<TempEmail>()

    if (!result) {
      throw new Error('Failed to create temp email')
    }

    return result
  }

  async createTempEmailWithQuota(
    userId: number,
    email: string,
    domainId: number,
    audit?: { ipAddress: string; userAgent: string }
  ): Promise<TempEmail | null> {
    const operationId = crypto.randomUUID()
    const statements: D1PreparedStatement[] = [
      this.db.prepare(`
        INSERT INTO temp_emails (user_id, email, domain_id, creation_key, created_at)
        SELECT ?, ?, d.id, ?, CURRENT_TIMESTAMP
        FROM domains d
        WHERE d.id = ? AND d.status = 1 AND d.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = ? AND u.is_active = 1
              AND EXISTS (
                SELECT 1 FROM user_quota_balances b
                WHERE b.user_id = u.id AND b.amount > 0
                  AND (b.expires_at IS NULL OR datetime(b.expires_at) > CURRENT_TIMESTAMP)
              )
          )
        RETURNING id, user_id, email, domain_id, created_at, active, public_inbox_enabled
      `).bind(userId, email, operationId, domainId, userId),
      this.db.prepare(`
        UPDATE user_quota_balances
        SET amount = amount - 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = (
          SELECT id FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
            AND EXISTS (
              SELECT 1 FROM temp_emails
              WHERE creation_key = ? AND user_id = ? AND domain_id = ?
            )
          ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
            datetime(expires_at), id
          LIMIT 1
        )
      `).bind(userId, operationId, userId, domainId),
      this.db.prepare(`
        UPDATE users
        SET quota = COALESCE((
          SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), 0), updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM temp_emails
          WHERE creation_key = ? AND user_id = ? AND domain_id = ?
        )
      `).bind(userId, userId, operationId, userId, domainId),
      this.db.prepare(`
        INSERT INTO quota_logs
          (user_id, type, amount, source, description, related_id, quota_type, created_at)
        SELECT ?, 'consume', 1, 'create_email', '创建临时邮箱 ID: ' || id,
          id, 'permanent', CURRENT_TIMESTAMP
        FROM temp_emails
        WHERE creation_key = ? AND user_id = ? AND domain_id = ?
      `).bind(userId, operationId, userId, domainId)
    ]

    if (audit) {
      statements.push(this.db.prepare(`
        INSERT INTO logs (user_id, action, ip_address, user_agent, details, timestamp)
        SELECT ?, 'CREATE_EMAIL', ?, ?, 'Created temp email ID: ' || id, CURRENT_TIMESTAMP
        FROM temp_emails
        WHERE creation_key = ? AND user_id = ? AND domain_id = ?
      `).bind(userId, audit.ipAddress, audit.userAgent, operationId, userId, domainId))
    }

    const results = await this.db.batch(statements)

    const rows = results[0]?.results as unknown as TempEmail[] | undefined
    return rows?.[0] ?? null
  }

  async getTempEmailsByUserId(userId: number): Promise<TempEmail[]> {
    const result = await this.db.prepare(`
      SELECT id, user_id, email, domain_id, created_at, active, public_inbox_enabled
      FROM temp_emails
      WHERE user_id = ? AND active = 1 
      ORDER BY created_at DESC
    `).bind(userId).all<TempEmail>()

    return result.results || []
  }

  async getTempEmailByEmail(email: string): Promise<TempEmail | null> {
    return await this.db.prepare(`
      SELECT id, user_id, email, domain_id, created_at, active, public_inbox_enabled
      FROM temp_emails WHERE email = ? COLLATE NOCASE AND active = 1
    `).bind(email).first<TempEmail>()
  }

  async getTempEmailForUser(id: number, userId: number): Promise<TempEmail | null> {
    return await this.db.prepare(`
      SELECT id, user_id, email, domain_id, created_at, active, public_inbox_enabled
      FROM temp_emails
      WHERE id = ? AND user_id = ? AND active = 1
    `).bind(id, userId).first<TempEmail>()
  }

  async getPublicTempEmailByEmail(email: string): Promise<TempEmail | null> {
    return await this.db.prepare(`
      SELECT te.id, te.user_id, te.email, te.domain_id, te.created_at,
        te.active, te.public_inbox_enabled
      FROM temp_emails te
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE te.email = ? COLLATE NOCASE
        AND te.active = 1
        AND te.public_inbox_enabled = 1
        AND u.is_active = 1
        AND d.status = 1
        AND d.deleted_at IS NULL
    `).bind(email).first<TempEmail>()
  }

  async getPublicInboxSnapshot(
    emailAddress: string,
    pagination: PaginationParams
  ): Promise<{ tempEmail: TempEmail; emails: PaginatedResponse<PublicEmailSummary> } | null> {
    const visibility = `
      te.email = ? COLLATE NOCASE
      AND te.active = 1
      AND te.public_inbox_enabled = 1
      AND u.is_active = 1
      AND d.status = 1
      AND d.deleted_at IS NULL
    `
    const results = await this.db.batch([
      this.db.prepare(`
        SELECT te.id, te.user_id, te.email, te.domain_id, te.created_at,
          te.active, te.public_inbox_enabled
        FROM temp_emails te
        JOIN users u ON u.id = te.user_id
        JOIN domains d ON d.id = te.domain_id
        WHERE ${visibility}
        LIMIT 1
      `).bind(emailAddress),
      this.db.prepare(`
        SELECT COUNT(*) AS total
        FROM emails e
        JOIN temp_emails te ON te.id = e.temp_email_id
        JOIN users u ON u.id = te.user_id
        JOIN domains d ON d.id = te.domain_id
        WHERE ${visibility}
          AND datetime(e.received_at) > datetime('now', '-7 days')
      `).bind(emailAddress),
      this.db.prepare(`
        SELECT e.id, e.sender, e.subject,
          substr(COALESCE(e.content, ''), 1, 240) AS content,
          substr(COALESCE(e.content, ''), 1, 240) AS content_preview,
          e.verification_code, e.received_at
        FROM emails e
        JOIN temp_emails te ON te.id = e.temp_email_id
        JOIN users u ON u.id = te.user_id
        JOIN domains d ON d.id = te.domain_id
        WHERE ${visibility}
          AND datetime(e.received_at) > datetime('now', '-7 days')
        ORDER BY e.received_at DESC, e.id DESC
        LIMIT ? OFFSET ?
      `).bind(emailAddress, pagination.limit, pagination.offset)
    ])

    const tempEmail = (results[0]?.results as unknown as TempEmail[] | undefined)?.[0]
    if (!tempEmail) return null

    const total = Number(
      (results[1]?.results as Array<{ total: number }> | undefined)?.[0]?.total ?? 0
    )
    return {
      tempEmail,
      emails: {
        data: (results[2]?.results as PublicEmailSummary[] | undefined) ?? [],
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit)
      }
    }
  }

  async getPublicEmailForInbox(id: number, emailAddress: string): Promise<PublicEmailDetail | null> {
    return await this.db.prepare(`
      SELECT e.id, e.sender, e.subject, e.content,
        e.content AS content_preview, e.html_content, e.verification_code, e.received_at
      FROM emails e
      JOIN temp_emails te ON te.id = e.temp_email_id
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE e.id = ?
        AND te.email = ? COLLATE NOCASE
        AND te.active = 1
        AND te.public_inbox_enabled = 1
        AND u.is_active = 1
        AND d.status = 1
        AND d.deleted_at IS NULL
        AND datetime(e.received_at) > datetime('now', '-7 days')
      LIMIT 1
    `).bind(id, emailAddress).first<PublicEmailDetail>()
  }

  async updateTempEmailPublicInbox(
    id: number,
    userId: number,
    publicInboxEnabled: boolean
  ): Promise<TempEmail | null> {
    const enabled = publicInboxEnabled ? 1 : 0
    const results = await this.db.batch([
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT ?, 'UPDATE_PUBLIC_INBOX', ?, CURRENT_TIMESTAMP
        FROM temp_emails
        WHERE id = ? AND user_id = ? AND active = 1
      `).bind(
        userId,
        publicInboxEnabled
          ? `Enabled public inbox for temp email ID: ${id}`
          : `Disabled public inbox for temp email ID: ${id}`,
        id,
        userId
      ),
      this.db.prepare(`
        UPDATE temp_emails
        SET public_inbox_enabled = ?
        WHERE id = ? AND user_id = ? AND active = 1
        RETURNING id, user_id, email, domain_id, created_at, active, public_inbox_enabled
      `).bind(enabled, id, userId)
    ])

    const rows = results[1]?.results as unknown as TempEmail[] | undefined
    return rows?.[0] ?? null
  }

  async deleteTempEmail(id: number, userId: number): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT ?, 'DELETE_EMAIL', ?, CURRENT_TIMESTAMP
        FROM temp_emails
        WHERE id = ? AND user_id = ? AND active = 1
      `).bind(userId, `Deleted temp email ID: ${id}`, id, userId),
      this.db.prepare(`
        UPDATE temp_emails
        SET active = 0
        WHERE id = ? AND user_id = ? AND active = 1
      `).bind(id, userId)
    ])

    return Number(results[1]?.meta?.changes ?? 0) > 0
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
      INSERT INTO emails (
        temp_email_id, sender, subject, content, html_content, verification_code, received_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id, temp_email_id, sender, subject, content, html_content,
        verification_code, is_read, received_at
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
    pagination: PaginationParams,
    userId?: number
  ): Promise<PaginatedResponse<Email>> {
    const ownership = userId === undefined
      ? ''
      : 'AND EXISTS (SELECT 1 FROM temp_emails te WHERE te.id = emails.temp_email_id AND te.user_id = ? AND te.active = 1)'
    const ownerBindings = userId === undefined ? [] : [userId]
    const results = await this.db.batch([
      this.db.prepare(`
        SELECT COUNT(*) AS total FROM emails
        WHERE temp_email_id = ?
          AND datetime(received_at) > datetime('now', '-7 days')
          ${ownership}
      `).bind(tempEmailId, ...ownerBindings),
      this.db.prepare(`
        SELECT id, temp_email_id, sender, subject,
          substr(COALESCE(content, ''), 1, 240) AS content,
          substr(COALESCE(content, ''), 1, 240) AS content_preview,
          NULL AS html_content, verification_code, is_read, received_at
        FROM emails
        WHERE temp_email_id = ?
          AND datetime(received_at) > datetime('now', '-7 days')
          ${ownership}
        ORDER BY received_at DESC, id DESC
        LIMIT ? OFFSET ?
      `).bind(tempEmailId, ...ownerBindings, pagination.limit, pagination.offset)
    ])

    const total = Number((results[0]?.results as Array<{ total: number }> | undefined)?.[0]?.total ?? 0)

    return {
      data: (results[1]?.results as Email[] | undefined) ?? [],
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit)
    }
  }

  async getEmailById(id: number): Promise<Email | null> {
    return await this.db.prepare(`
      SELECT id, temp_email_id, sender, subject, content, html_content,
        verification_code, is_read, received_at
      FROM emails
      WHERE id = ? AND datetime(received_at) > datetime('now', '-7 days')
    `).bind(id).first<Email>()
  }

  async getEmailForUser(id: number, userId: number): Promise<Email | null> {
    return await this.db.prepare(`
      SELECT e.id, e.temp_email_id, e.sender, e.subject, e.content,
        e.html_content, e.verification_code, e.is_read, e.received_at
      FROM emails e
      JOIN temp_emails te ON te.id = e.temp_email_id
      WHERE e.id = ? AND te.user_id = ? AND te.active = 1
        AND datetime(e.received_at) > datetime('now', '-7 days')
    `).bind(id, userId).first<Email>()
  }

  async deleteEmailForUser(id: number, userId: number): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT ?, 'DELETE_EMAIL_CONTENT', ?, CURRENT_TIMESTAMP
        FROM emails e
        JOIN temp_emails te ON te.id = e.temp_email_id
        WHERE e.id = ? AND te.user_id = ?
      `).bind(userId, `Deleted email ID: ${id}`, id, userId),
      this.db.prepare(`
        DELETE FROM emails
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM temp_emails te
          WHERE te.id = emails.temp_email_id AND te.user_id = ?
        )
      `).bind(id, userId)
    ])
    return Number(results[1]?.meta?.changes ?? 0) > 0
  }

  async markEmailReadForUser(id: number, userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      UPDATE emails SET is_read = 1
      WHERE id = ? AND EXISTS (
        SELECT 1 FROM temp_emails te
        WHERE te.id = emails.temp_email_id AND te.user_id = ? AND te.active = 1
      )
      RETURNING id
    `).bind(id, userId).first<{ id: number }>()
    return result !== null
  }

  async batchDeleteEmailsForUser(ids: number[], userId: number): Promise<number> {
    if (ids.length === 0) return 0
    const placeholders = ids.map(() => '?').join(', ')
    const results = await this.db.batch([
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT ?, 'BATCH_DELETE_EMAIL_CONTENT', ?, CURRENT_TIMESTAMP
        WHERE EXISTS (
          SELECT 1
          FROM emails e
          JOIN temp_emails te ON te.id = e.temp_email_id
          WHERE e.id IN (${placeholders}) AND te.user_id = ?
        )
      `).bind(
        userId,
        JSON.stringify({ requested: ids.length }),
        ...ids,
        userId
      ),
      this.db.prepare(`
        DELETE FROM emails
        WHERE id IN (${placeholders}) AND EXISTS (
          SELECT 1 FROM temp_emails te
          WHERE te.id = emails.temp_email_id AND te.user_id = ?
        )
      `).bind(...ids, userId)
    ])
    return Number(results[1]?.meta?.changes ?? 0)
  }

  async searchEmailsForUser(
    userId: number,
    filters: {
      tempEmailId?: number
      keyword?: string
      sender?: string
      dateFrom?: string
      dateTo?: string
    },
    pagination: PaginationParams
  ): Promise<PaginatedResponse<Email>> {
    const conditions = [
      'te.user_id = ?',
      'te.active = 1',
      "datetime(e.received_at) > datetime('now', '-7 days')"
    ]
    const bindings: Array<string | number> = [userId]
    if (filters.tempEmailId !== undefined) {
      conditions.push('e.temp_email_id = ?')
      bindings.push(filters.tempEmailId)
    }
    if (filters.keyword) {
      conditions.push(`(e.subject LIKE ? ESCAPE '\\' OR e.sender LIKE ? ESCAPE '\\' OR e.content LIKE ? ESCAPE '\\')`)
      const keyword = `%${this.escapeLike(filters.keyword)}%`
      bindings.push(keyword, keyword, keyword)
    }
    if (filters.sender) {
      conditions.push(`e.sender LIKE ? ESCAPE '\\'`)
      bindings.push(`%${this.escapeLike(filters.sender)}%`)
    }
    if (filters.dateFrom) {
      conditions.push('datetime(e.received_at) >= datetime(?)')
      bindings.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      conditions.push('datetime(e.received_at) < datetime(?)')
      bindings.push(filters.dateTo)
    }
    const where = conditions.join(' AND ')
    const results = await this.db.batch([
      this.db.prepare(`
        SELECT COUNT(*) AS total
        FROM emails e JOIN temp_emails te ON te.id = e.temp_email_id
        WHERE ${where}
      `).bind(...bindings),
      this.db.prepare(`
        SELECT e.id, e.temp_email_id, e.sender, e.subject,
          substr(COALESCE(e.content, ''), 1, 240) AS content,
          substr(COALESCE(e.content, ''), 1, 240) AS content_preview,
          NULL AS html_content, e.verification_code, e.is_read, e.received_at
        FROM emails e JOIN temp_emails te ON te.id = e.temp_email_id
        WHERE ${where}
        ORDER BY e.received_at DESC, e.id DESC
        LIMIT ? OFFSET ?
      `).bind(...bindings, pagination.limit, pagination.offset)
    ])
    const total = Number((results[0]?.results as Array<{ total: number }> | undefined)?.[0]?.total ?? 0)
    return {
      data: (results[1]?.results as Email[] | undefined) ?? [],
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
      SELECT id, domain, status, created_at
      FROM domains WHERE status = 1 AND deleted_at IS NULL ORDER BY domain
    `).all<Domain>()

    return result.results || []
  }

  async getDomainById(id: number): Promise<Domain | null> {
    return await this.db.prepare(`
      SELECT id, domain, status, created_at
      FROM domains WHERE id = ? AND deleted_at IS NULL
    `).bind(id).first<Domain>()
  }

  // 兑换码相关操作
  async getRedeemCode(code: string): Promise<RedeemCode | null> {
    return await this.db.prepare(`
      SELECT id, code, name, quota, valid_until, used, used_by, used_at,
        created_at, max_uses, used_count, never_expires
      FROM redeem_codes WHERE code = ? COLLATE NOCASE
    `).bind(code.trim()).first<RedeemCode>()
  }

  async useRedeemCode(code: string, userId: number): Promise<boolean> {
    // 检查用户是否已经使用过这个兑换码
    const existingUsage = await this.db.prepare(`
      SELECT rcu.id
      FROM redeem_code_usages rcu
      JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
      WHERE rc.code = ? COLLATE NOCASE AND rcu.user_id = ?
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
      SELECT COUNT(*) as count
      FROM redeem_code_usages rcu
      JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
      WHERE rc.code = ? COLLATE NOCASE
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
      INSERT INTO redeem_code_usages (
        redeem_code_id, user_id, quota_amount, operation_id, used_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(redeemCode.id, userId, redeemCode.quota, crypto.randomUUID()).run()

    // 如果这是第一次使用，更新兑换码的used字段（保持向后兼容）
    if (currentUses === 0) {
      await this.db.prepare(`
        UPDATE redeem_codes
        SET used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP
        WHERE code = ?
      `).bind(userId, code).run()
    }

    return (result.meta?.changes ?? 0) > 0
  }

  // 检查用户是否已使用过兑换码
  async hasUserUsedRedeemCode(code: string, userId: number): Promise<boolean> {
    const result = await this.db.prepare(`
      SELECT rcu.id
      FROM redeem_code_usages rcu
      JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
      WHERE rc.code = ? COLLATE NOCASE AND rcu.user_id = ?
    `).bind(code, userId).first()

    return !!result
  }

  // 获取兑换码的使用次数
  async getRedeemCodeUsageCount(code: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count
      FROM redeem_code_usages rcu
      JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
      WHERE rc.code = ? COLLATE NOCASE
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
      FROM redeem_code_usages rcu
      JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
      JOIN users u ON rcu.user_id = u.id
      WHERE rc.code = ? COLLATE NOCASE
      ORDER BY rcu.used_at DESC
    `).bind(code).all()

    return result.results as Array<{userId: number, userEmail: string, usedAt: string}> || []
  }

  async redeemCodeAtomically(code: string, userId: number): Promise<{ quota: number; awarded: number } | null> {
    const operationId = crypto.randomUUID()
    const results = await this.db.batch([
      this.db.prepare(`
        INSERT INTO redeem_code_usages
          (redeem_code_id, user_id, quota_amount, operation_id, used_at)
        SELECT rc.id, ?, rc.quota, ?, CURRENT_TIMESTAMP
        FROM redeem_codes rc
        WHERE rc.code = ? COLLATE NOCASE
          AND (rc.never_expires = 1 OR rc.valid_until IS NULL OR datetime(rc.valid_until) > CURRENT_TIMESTAMP)
          AND rc.used_count < rc.max_uses
          AND NOT EXISTS (
            SELECT 1 FROM redeem_code_usages existing
            WHERE existing.redeem_code_id = rc.id AND existing.user_id = ?
          )
        RETURNING quota_amount
      `).bind(userId, operationId, code, userId),
      this.db.prepare(`
        INSERT INTO user_quota_balances
          (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
        SELECT rcu.user_id,
          CASE WHEN rc.never_expires = 1 THEN 'permanent' ELSE 'custom' END,
          rcu.quota_amount,
          CASE WHEN rc.never_expires = 1 THEN NULL ELSE datetime(rc.valid_until) END,
          'redeem_code', rc.id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM redeem_code_usages rcu
        JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
        WHERE rcu.operation_id = ?
      `).bind(operationId),
      this.db.prepare(`
        INSERT INTO quota_logs
          (user_id, type, amount, source, description, related_id,
            operation_id, expires_at, quota_type, created_at)
        SELECT rcu.user_id, 'earn', rcu.quota_amount, 'redeem_code',
          '兑换码奖励: ' || rc.code, rc.id,
          rcu.operation_id,
          CASE WHEN rc.never_expires = 1 THEN NULL ELSE datetime(rc.valid_until) END,
          CASE WHEN rc.never_expires = 1 THEN 'permanent' ELSE 'custom' END,
          CURRENT_TIMESTAMP
        FROM redeem_code_usages rcu
        JOIN redeem_codes rc ON rc.id = rcu.redeem_code_id
        WHERE rcu.operation_id = ?
      `).bind(operationId),
      this.db.prepare(`
        UPDATE users
        SET quota = COALESCE((
          SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), 0), updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM redeem_code_usages WHERE operation_id = ?
        )
        RETURNING quota
      `).bind(userId, userId, operationId),
      this.db.prepare(`
        UPDATE redeem_codes
        SET used = 1,
          used_by = COALESCE(used_by, ?),
          used_at = COALESCE(used_at, CURRENT_TIMESTAMP)
        WHERE id = (
          SELECT redeem_code_id FROM redeem_code_usages WHERE operation_id = ?
        )
      `).bind(userId, operationId),
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT rcu.user_id, 'REDEEM_CODE',
          'redeem_code_id=' || rcu.redeem_code_id || '; quota=' || rcu.quota_amount,
          CURRENT_TIMESTAMP
        FROM redeem_code_usages rcu
        WHERE rcu.operation_id = ?
      `).bind(operationId)
    ])

    const awardRows = results[0]?.results as Array<{ quota_amount: number }> | undefined
    if (!awardRows?.[0]) return null
    const quotaRows = results[3]?.results as Array<{ quota: number }> | undefined
    return {
      quota: Number(quotaRows?.[0]?.quota ?? 0),
      awarded: Number(awardRows[0].quota_amount)
    }
  }

  // 刷新令牌相关操作
  async storeRefreshToken(userId: number, tokenHash: string, expiresAt: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(userId, tokenHash, this.toSqlTimestamp(expiresAt)).run()
  }

  async consumeRefreshToken(tokenHash: string): Promise<number | null> {
    const consumed = await this.db.prepare(`
      UPDATE refresh_tokens
      SET is_revoked = 1
      WHERE token_hash = ?
        AND is_revoked = 0
        AND datetime(expires_at) > CURRENT_TIMESTAMP
      RETURNING user_id
    `).bind(tokenHash).first<{ user_id: number }>()

    return consumed ? Number(consumed.user_id) : null
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(`UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?`).bind(tokenHash),
      this.db.prepare(`
        DELETE FROM refresh_tokens
        WHERE datetime(expires_at) <= CURRENT_TIMESTAMP
          OR (is_revoked = 1 AND datetime(created_at) < datetime('now', '-7 days'))
      `)
    ])
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
      INSERT INTO logs (user_id, action, ip_address, user_agent, details, timestamp)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      logData.userId ?? null,
      logData.action,
      logData.ipAddress ?? null,
      logData.userAgent ?? null,
      logData.details ?? null
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
      SELECT id, setting_key, setting_value, description, created_at, updated_at
      FROM system_settings WHERE setting_key = ?
    `).bind(key).first<SystemSetting>()
  }

  async updateSystemSetting(key: string, value: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO system_settings (setting_key, setting_value, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `).bind(key, value).run()
  }

  // ==================== 配额记录相关操作 ====================

  async createQuotaLog(data: {
    userId: number
    type: 'earn' | 'consume'
    amount: number
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email'
    description?: string
    relatedId?: number
    expiresAt?: string | null
    quotaType?: 'permanent' | 'daily' | 'custom'
  }): Promise<QuotaLog> {
    const result = await this.db.prepare(`
      INSERT INTO quota_logs (
        user_id, type, amount, source, description, related_id, expires_at,
        quota_type, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id, user_id, type, amount, source, description, related_id,
        created_at, expires_at, quota_type
    `).bind(
      data.userId,
      data.type,
      data.amount,
      data.source,
      data.description || null,
      data.relatedId ?? null,
      data.expiresAt ? this.toSqlTimestamp(data.expiresAt) : null,
      data.quotaType ?? 'permanent'
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
    page = Number.isSafeInteger(page) && page > 0 ? page : 1
    limit = Number.isSafeInteger(limit) ? Math.min(100, Math.max(1, limit)) : 20
    const offset = (page - 1) * limit

    const logsStatement = this.db.prepare(`
      SELECT id, user_id, type, amount, source, description, related_id,
        created_at, expires_at, quota_type
      FROM quota_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset)

    const countStatement = this.db.prepare(`
      SELECT COUNT(*) as total FROM quota_logs WHERE user_id = ?
    `).bind(userId)
    const [logsResult, countResult] = await this.db.batch([logsStatement, countStatement])
    const countRow = countResult?.results?.[0] as { total?: number } | undefined

    return {
      logs: (logsResult?.results ?? []) as unknown as QuotaLog[],
      total: Math.max(0, Number(countRow?.total) || 0)
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
    source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust'
    sourceId?: number | null
  }): Promise<UserQuotaBalance> {
    const result = await this.db.prepare(`
      INSERT INTO user_quota_balances (
        user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, quota_type, amount, expires_at, source, source_id,
        created_at, updated_at
    `).bind(
      data.userId,
      data.quotaType,
      data.amount,
      data.expiresAt ? this.toSqlTimestamp(data.expiresAt) : null,
      data.source,
      data.sourceId ?? null
    ).first<UserQuotaBalance>()

    if (!result) {
      throw new Error('Failed to create quota balance')
    }

    return result
  }

  // 获取用户有效配额余额（按过期时间排序，即将过期的在前）
  async getUserQuotaBalances(userId: number): Promise<UserQuotaBalance[]> {
    return await this.db.prepare(`
      SELECT id, user_id, quota_type, amount, expires_at, source, source_id,
        created_at, updated_at
      FROM user_quota_balances
      WHERE user_id = ?
        AND amount > 0
        AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
      ORDER BY
        CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
        expires_at ASC
    `).bind(userId).all<UserQuotaBalance>().then(result => result.results || [])
  }

  // 获取用户总配额（包括已过期的）
  async getUserTotalQuota(userId: number): Promise<{
    total: number
    available: number
    expired: number
  }> {
    const result = await this.db.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total,
        COALESCE(SUM(CASE WHEN expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP THEN amount ELSE 0 END), 0) as available,
        COALESCE(SUM(CASE WHEN expires_at IS NOT NULL AND datetime(expires_at) <= CURRENT_TIMESTAMP THEN amount ELSE 0 END), 0) as expired
      FROM user_quota_balances
      WHERE user_id = ?
    `).bind(userId).first<{
      total: number
      available: number
      expired: number
    }>()

    return result || { total: 0, available: 0, expired: 0 }
  }

  async getQuotaOverview(userId: number): Promise<{
    total: number
    available: number
    expired: number
    used: number
    expiring: number
  }> {
    const result = await this.db.prepare(`
      SELECT
        COALESCE((SELECT SUM(amount) FROM quota_logs
          WHERE user_id = ? AND type = 'earn'), 0) AS total,
        COALESCE((SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)), 0) AS available,
        COALESCE((SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND expires_at IS NOT NULL
            AND datetime(expires_at) <= CURRENT_TIMESTAMP), 0) AS expired,
        COALESCE((SELECT SUM(amount) FROM quota_logs
          WHERE user_id = ? AND type = 'consume'), 0) AS used,
        COALESCE((SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND amount > 0 AND expires_at IS NOT NULL
            AND datetime(expires_at) > CURRENT_TIMESTAMP
            AND datetime(expires_at) <= datetime('now', '+24 hours')), 0) AS expiring
    `).bind(userId, userId, userId, userId, userId).first<{
      total: number
      available: number
      expired: number
      used: number
      expiring: number
    }>()

    return {
      total: Math.max(0, Number(result?.total ?? 0)),
      available: Math.max(0, Number(result?.available ?? 0)),
      expired: Math.max(0, Number(result?.expired ?? 0)),
      used: Math.max(0, Number(result?.used ?? 0)),
      expiring: Math.max(0, Number(result?.expiring ?? 0))
    }
  }

  async adjustUserQuotaAtomically(data: {
    userId: number
    actorUserId: number
    amount: number
    description: string
  }): Promise<'success' | 'not_found' | 'insufficient'> {
    if (!Number.isSafeInteger(data.userId) || data.userId <= 0) return 'not_found'
    if (!Number.isSafeInteger(data.amount) || data.amount === 0) {
      throw new Error('Quota adjustment must be a non-zero safe integer')
    }

    const operationId = crypto.randomUUID()
    const absoluteAmount = Math.abs(data.amount)
    const isCredit = data.amount > 0
    const type = isCredit ? 'earn' : 'consume'
    const auditDetails = JSON.stringify({
      operationId,
      targetUserId: data.userId,
      amount: data.amount,
      description: data.description
    })

    const operationGuard = isCredit
      ? ''
      : `AND ? <= COALESCE((
          SELECT SUM(amount)
          FROM user_quota_balances
          WHERE user_id = u.id AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), 0)`
    const operationBindings: Array<string | number> = [
      type,
      absoluteAmount,
      data.description,
      operationId,
      data.userId
    ]
    if (!isCredit) operationBindings.push(absoluteAmount)

    const balanceMutation = isCredit
      ? this.db.prepare(`
          INSERT INTO user_quota_balances
            (user_id, quota_type, amount, expires_at, source, source_id, created_at, updated_at)
          SELECT user_id, 'permanent', amount, NULL, 'admin_adjust', NULL,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM quota_logs
          WHERE operation_id = ?
        `).bind(operationId)
      : this.db.prepare(`
          WITH eligible AS (
            SELECT id, amount,
              COALESCE(SUM(amount) OVER (
                ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
                  datetime(expires_at), id
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
              ), 0) AS prior_amount
            FROM user_quota_balances
            WHERE user_id = ? AND amount > 0
              AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
          ), deductions AS (
            SELECT id,
              CASE
                WHEN ? <= prior_amount THEN 0
                WHEN ? - prior_amount >= amount THEN amount
                ELSE ? - prior_amount
              END AS deduction
            FROM eligible
          )
          UPDATE user_quota_balances
          SET amount = amount - (
            SELECT deduction FROM deductions WHERE deductions.id = user_quota_balances.id
          ), updated_at = CURRENT_TIMESTAMP
          WHERE id IN (SELECT id FROM deductions WHERE deduction > 0)
            AND EXISTS (SELECT 1 FROM quota_logs WHERE operation_id = ?)
        `).bind(data.userId, absoluteAmount, absoluteAmount, absoluteAmount, operationId)

    const results = await this.db.batch([
      this.db.prepare('SELECT id FROM users WHERE id = ?').bind(data.userId),
      this.db.prepare(`
        INSERT INTO quota_logs
          (user_id, type, amount, source, description, related_id,
            operation_id, expires_at, quota_type, created_at)
        SELECT u.id, ?, ?, 'admin_adjust', ?, NULL, ?, NULL, 'permanent',
          CURRENT_TIMESTAMP
        FROM users u
        WHERE u.id = ? ${operationGuard}
        RETURNING operation_id
      `).bind(...operationBindings),
      balanceMutation,
      this.db.prepare(`
        UPDATE users
        SET quota = COALESCE((
          SELECT SUM(amount)
          FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), 0), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND EXISTS (SELECT 1 FROM quota_logs WHERE operation_id = ?)
      `).bind(data.userId, data.userId, operationId),
      this.db.prepare(`
        INSERT INTO logs (user_id, action, details, timestamp)
        SELECT ?, 'ADMIN_QUOTA_ADJUST', ?, CURRENT_TIMESTAMP
        FROM quota_logs
        WHERE operation_id = ?
      `).bind(data.actorUserId, auditDetails, operationId)
    ])

    const userRows = results[0]?.results as Array<{ id: number }> | undefined
    if (!userRows?.length) return 'not_found'

    const operationRows = results[1]?.results as Array<{ operation_id: string }> | undefined
    if (!operationRows?.length) return 'insufficient'
    return 'success'
  }

  // 消费配额（优先消费即将过期的配额）
  async consumeQuota(userId: number, amount: number): Promise<boolean> {
    if (!Number.isSafeInteger(amount) || amount <= 0) return false

    const results = await this.db.batch([
      this.db.prepare(`
        WITH eligible AS (
          SELECT id, amount,
            COALESCE(SUM(amount) OVER (
              ORDER BY CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END,
                datetime(expires_at), id
              ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ), 0) AS prior_amount,
            SUM(amount) OVER () AS total_amount
          FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), deductions AS (
          SELECT id, total_amount,
            CASE
              WHEN ? <= prior_amount THEN 0
              WHEN ? - prior_amount >= amount THEN amount
              ELSE ? - prior_amount
            END AS deduction
          FROM eligible
        )
        UPDATE user_quota_balances
        SET amount = amount - (
          SELECT deduction FROM deductions WHERE deductions.id = user_quota_balances.id
        ), updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT id FROM deductions WHERE total_amount >= ? AND deduction > 0
        )
        RETURNING id
      `).bind(userId, amount, amount, amount, amount),
      this.db.prepare(`
        UPDATE users
        SET quota = COALESCE((
          SELECT SUM(amount) FROM user_quota_balances
          WHERE user_id = ? AND amount > 0
            AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
        ), 0), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(userId, userId)
    ])

    return (results[0]?.results?.length ?? 0) > 0
  }

  // 清理过期配额
  async cleanupExpiredQuotas(userId?: number): Promise<number> {
    const condition = userId === undefined ? '' : 'AND user_id = ?'
    const result = await this.db.prepare(`
      DELETE FROM user_quota_balances
      WHERE expires_at IS NOT NULL AND datetime(expires_at) <= CURRENT_TIMESTAMP ${condition}
    `).bind(...(userId === undefined ? [] : [userId])).run()

    // 同时更新用户表中的配额字段
    await this.db.prepare(`
      UPDATE users SET quota = (
        SELECT COALESCE(SUM(amount), 0)
        FROM user_quota_balances
        WHERE user_quota_balances.user_id = users.id
          AND (expires_at IS NULL OR datetime(expires_at) > CURRENT_TIMESTAMP)
      )
      ${userId === undefined ? '' : 'WHERE id = ?'}
    `).bind(...(userId === undefined ? [] : [userId])).run()

    return result.meta?.changes || 0
  }

  // 获取即将过期的配额（24小时内过期）
  async getExpiringQuotas(userId?: number): Promise<UserQuotaBalance[]> {
    let query = `
      SELECT id, user_id, quota_type, amount, expires_at, source, source_id,
        created_at, updated_at
      FROM user_quota_balances
      WHERE expires_at IS NOT NULL
        AND datetime(expires_at) > CURRENT_TIMESTAMP
        AND datetime(expires_at) <= datetime('now', '+24 hours')
        AND amount > 0
    `
    const params: Array<string | number> = []

    if (userId) {
      query += ` AND user_id = ?`
      params.push(userId)
    }

    query += ` ORDER BY expires_at ASC`

    return await this.db.prepare(query).bind(...params).all<UserQuotaBalance>().then(result => result.results || [])
  }

  // 限流相关操作
  async getRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<RateLimit | null> {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
    return await this.db.prepare(`
      SELECT id, identifier, endpoint, request_count, window_start
      FROM rate_limits
      WHERE identifier = ? AND endpoint = ?
        AND datetime(window_start, '+' || ? || ' seconds') > CURRENT_TIMESTAMP
    `).bind(identifier, endpoint, windowSeconds).first<RateLimit>()
  }

  async createOrUpdateRateLimit(identifier: string, endpoint: string, windowMs: number): Promise<number> {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
    const result = await this.db.prepare(`
      INSERT INTO rate_limits (identifier, endpoint, request_count, window_start)
      VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(identifier, endpoint) DO UPDATE SET
        request_count = CASE
          WHEN datetime(rate_limits.window_start, '+' || ? || ' seconds') <= CURRENT_TIMESTAMP THEN 1
          ELSE rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN datetime(rate_limits.window_start, '+' || ? || ' seconds') <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP
          ELSE rate_limits.window_start
        END
      RETURNING request_count
    `).bind(identifier, endpoint, windowSeconds, windowSeconds).first<{ request_count: number }>()

    // Expired identifiers would otherwise accumulate forever. Keep cleanup
    // off the hot path for almost every request while still bounding growth.
    const cleanupSample = new Uint8Array(1)
    crypto.getRandomValues(cleanupSample)
    if (cleanupSample[0] === 0) {
      try {
        await this.db.prepare(`
          DELETE FROM rate_limits
          WHERE datetime(window_start) < datetime('now', '-24 hours')
        `).run()
      } catch (error) {
        console.warn('Rate-limit cleanup deferred:', error instanceof Error ? error.message : error)
      }
    }

    return Number(result?.request_count ?? 1)
  }

  async cleanupRetainedData(): Promise<{
    emails: number
    emailDeliveryDedup: number
    tempEmails: number
    logs: number
    refreshTokens: number
    rateLimits: number
  }> {
    const results = await this.db.batch([
      this.db.prepare(`
        WITH ranked AS (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY temp_email_id ORDER BY id DESC
            ) AS position,
            SUM(
              COALESCE(length(CAST(sender AS BLOB)), 0) +
              COALESCE(length(CAST(subject AS BLOB)), 0) +
              COALESCE(length(CAST(content AS BLOB)), 0) +
              COALESCE(length(CAST(html_content AS BLOB)), 0) +
              COALESCE(length(CAST(verification_code AS BLOB)), 0)
            ) OVER (
              PARTITION BY temp_email_id
              ORDER BY id DESC ROWS UNBOUNDED PRECEDING
            ) AS cumulative_bytes
          FROM emails
        )
        DELETE FROM emails
        WHERE datetime(received_at) <= datetime('now', '-7 days')
          OR id IN (
            SELECT id FROM ranked
            WHERE position > 50 OR cumulative_bytes > 4194304
          )
      `),
      this.db.prepare(`
        WITH ranked AS (
          SELECT rowid,
            ROW_NUMBER() OVER (
              PARTITION BY temp_email_id ORDER BY rowid DESC
            ) AS inbox_position,
            ROW_NUMBER() OVER (ORDER BY rowid DESC) AS global_position
          FROM email_delivery_dedup
        )
        DELETE FROM email_delivery_dedup
        WHERE datetime(received_at) < datetime('now', '-24 hours')
          OR rowid IN (
            SELECT rowid FROM ranked
            WHERE inbox_position > 4096 OR global_position > 100000
          )
      `),
      this.db.prepare(`
        DELETE FROM temp_emails
        WHERE active = 0
      `),
      this.db.prepare(`
        DELETE FROM logs
        WHERE datetime(timestamp) < datetime('now', '-30 days')
      `),
      this.db.prepare(`
        DELETE FROM refresh_tokens
        WHERE datetime(expires_at) <= CURRENT_TIMESTAMP
          OR (is_revoked = 1 AND datetime(created_at) < datetime('now', '-7 days'))
      `),
      this.db.prepare(`
        DELETE FROM rate_limits
        WHERE datetime(window_start) < datetime('now', '-24 hours')
      `)
    ])

    const changes = (index: number): number => Number(results[index]?.meta?.changes ?? 0)
    return {
      emails: changes(0),
      emailDeliveryDedup: changes(1),
      tempEmails: changes(2),
      logs: changes(3),
      refreshTokens: changes(4),
      rateLimits: changes(5)
    }
  }

  private toSqlTimestamp(value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toISOString().slice(0, 19).replace('T', ' ')
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, character => `\\${character}`)
  }
}
