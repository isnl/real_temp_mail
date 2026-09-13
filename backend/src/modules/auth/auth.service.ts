import type { AdminBootstrapRequest, Env, LoginRequest, RegisterRequest, TokenPair, User } from '@/types'
import { AppError, AuthenticationError, ValidationError } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { SystemSettingsService } from '@/modules/settings/settings.service'
import { hashPassword, verifyPassword } from './password.service'
import { JWTService } from './jwt.service'

export class AuthService {
  private jwtService: JWTService
  private settings: SystemSettingsService

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {
    this.jwtService = new JWTService(env, dbService)
    this.settings = new SystemSettingsService(env)
  }

  async login(data: LoginRequest, request?: Request): Promise<{ user: User; tokens: TokenPair }> {
    const account = this.validateLoginData(data)
    const user = await this.dbService.getUserByAccount(account)

    // Keep unknown-account and wrong-password work approximately equivalent.
    const fallbackHash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
    const verification = await verifyPassword(data.password, user?.password_hash || fallbackHash)
    if (!user || !user.password_hash || !verification.valid) {
      throw new AuthenticationError('账号或密码错误')
    }
    if (!user.is_active) throw new AuthenticationError('账户已被禁用')

    if (verification.needsRehash) {
      await this.dbService.updateUserPassword(user.id, await hashPassword(data.password))
    }

    const tokens = await this.jwtService.generateTokenPair(user)
    await this.logRequest(request, user.id, 'LOGIN', `User logged in: ${user.email}`)
    return { user: this.sanitizeUser(user), tokens }
  }

  async register(data: RegisterRequest, request?: Request): Promise<{ user: User; tokens: TokenPair }> {
    if (!await this.settings.getBoolean('registration_enabled')) {
      throw new ValidationError('新用户注册当前已关闭')
    }

    const normalized = this.validateRegisterData(data)
    const [emailUser, usernameUser] = await Promise.all([
      this.dbService.getUserByEmail(normalized.email, true),
      normalized.username ? this.dbService.getUserByUsername(normalized.username, true) : Promise.resolve(null)
    ])
    if (emailUser) throw new ValidationError('该邮箱已注册')
    if (usernameUser) throw new ValidationError('该账号已被使用')

    const defaultQuota = Math.max(0, await this.settings.getInteger('default_user_quota'))
    let user: User
    try {
      user = await this.dbService.createRegisteredUser({
        email: normalized.email,
        username: normalized.username,
        passwordHash: await hashPassword(data.password),
        quota: defaultQuota
      })
    } catch (error) {
      if (this.dbService.isUniqueConstraintError(error)) {
        throw new ValidationError('邮箱或账号已被使用')
      }
      throw error
    }

    const tokens = await this.jwtService.generateTokenPair(user)
    await this.logRequest(request, user.id, 'REGISTER', `User registered: ${user.email}`)
    return { user: this.sanitizeUser(user), tokens }
  }

  async isAdminSetupRequired(): Promise<boolean> {
    return await this.dbService.isAdminSetupRequired()
  }

  async bootstrapAdmin(
    data: AdminBootstrapRequest,
    request?: Request
  ): Promise<{ user: User; tokens: TokenPair }> {
    if (!this.env.ADMIN_SETUP_TOKEN || this.env.ADMIN_SETUP_TOKEN.length < 32) {
      throw new AppError('管理员初始化令牌尚未配置', 503, 'ADMIN_SETUP_NOT_CONFIGURED')
    }
    if (typeof data.setupToken !== 'string' || !await this.secureEqual(data.setupToken, this.env.ADMIN_SETUP_TOKEN)) {
      throw new AuthenticationError('管理员初始化令牌无效')
    }
    if (!await this.dbService.isAdminSetupRequired()) {
      throw new ValidationError('管理员账号已经完成初始化')
    }

    const username = (data.username || '').trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,64}$/.test(username)) {
      throw new ValidationError('管理员账号须为 3-64 位字母、数字、点、下划线或短横线')
    }
    if (data.email && !this.isValidEmail(data.email.trim().toLowerCase())) {
      throw new ValidationError('请输入有效的管理员邮箱')
    }
    this.validatePassword(data.password)
    if (data.password !== data.confirmPassword) throw new ValidationError('两次输入的密码不一致')

    const user = await this.dbService.bootstrapPrimaryAdmin({
      username,
      email: data.email?.trim().toLowerCase(),
      passwordHash: await hashPassword(data.password)
    })
    if (!user) throw new ValidationError('管理员账号已经完成初始化')

    await this.settings.setValue('admin_username', username)
    await this.logRequest(request, user.id, 'ADMIN_BOOTSTRAP', 'Primary administrator initialized')
    return { user: this.sanitizeUser(user), tokens: await this.jwtService.generateTokenPair(user) }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokens = await this.jwtService.refreshTokens(refreshToken)
    if (!tokens) throw new AuthenticationError('无效的刷新令牌')
    return tokens
  }

  async logout(refreshToken: string): Promise<void> {
    await this.jwtService.revokeRefreshToken(refreshToken)
  }

  async getCurrentUser(userId: number): Promise<User> {
    const user = await this.dbService.getUserById(userId)
    if (!user) throw new AuthenticationError('用户不存在')
    return this.sanitizeUser(user)
  }

  async logUserAction(userId: number, action: string, details: string, request?: Request): Promise<void> {
    await this.logRequest(request, userId, action, details)
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    request?: Request
  ): Promise<void> {
    const user = await this.dbService.getUserById(userId)
    if (!user) throw new AuthenticationError('用户不存在')
    if (!user.password_hash) throw new AuthenticationError('该账户尚未设置本地密码')

    const verification = await verifyPassword(currentPassword, user.password_hash)
    if (!verification.valid) throw new AuthenticationError('当前密码错误')

    this.validatePassword(newPassword)
    if (currentPassword === newPassword) throw new ValidationError('新密码不能与当前密码相同')

    await this.dbService.updateUserPasswordAndRevokeTokens(userId, await hashPassword(newPassword))
    await this.logRequest(request, userId, 'CHANGE_PASSWORD', 'User changed password')
  }

  private validateLoginData(data: LoginRequest): string {
    const account = (data.account || data.email || '').trim().toLowerCase()
    if (!account || typeof data.password !== 'string' || !data.password) {
      throw new ValidationError('账号和密码不能为空')
    }
    if (account.length > 254 || data.password.length > 128) {
      throw new ValidationError('账号或密码格式无效')
    }
    return account
  }

  private validateRegisterData(data: RegisterRequest): { email: string; username: string | null } {
    const email = (data.email || '').trim().toLowerCase()
    const username = data.username?.trim().toLowerCase() || null
    if (!this.isValidEmail(email)) throw new ValidationError('请输入有效的邮箱地址')
    if (username && !/^[a-z0-9_.-]{3,64}$/.test(username)) {
      throw new ValidationError('账号须为 3-64 位字母、数字、点、下划线或短横线')
    }
    this.validatePassword(data.password)
    if (data.password !== data.confirmPassword) throw new ValidationError('两次输入的密码不一致')
    return { email, username }
  }

  private validatePassword(password: string): void {
    if (typeof password !== 'string' || password.length < 8) {
      throw new ValidationError('密码长度至少为 8 位')
    }
    if (password.length > 128) throw new ValidationError('密码长度不能超过 128 位')
  }

  private isValidEmail(email: string): boolean {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  private async secureEqual(left: string, right: string): Promise<boolean> {
    const [leftHash, rightHash] = await Promise.all([
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(left)),
      crypto.subtle.digest('SHA-256', new TextEncoder().encode(right))
    ])
    const leftBytes = new Uint8Array(leftHash)
    const rightBytes = new Uint8Array(rightHash)
    let difference = left.length ^ right.length
    for (let index = 0; index < leftBytes.length; index++) {
      difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
    }
    return difference === 0
  }

  private sanitizeUser(user: User): User {
    const { password_hash: _passwordHash, ...safeUser } = user
    return safeUser as User
  }

  private async logRequest(
    request: Request | undefined,
    userId: number,
    action: string,
    details: string
  ): Promise<void> {
    if (request) {
      await this.dbService.createLogWithRequest(request, { userId, action, details })
    } else {
      await this.dbService.createLog({ userId, action, details })
    }
  }
}
