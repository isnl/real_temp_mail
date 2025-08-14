import type {
  Env,
  User,
  LoginRequest,
  TokenPair,
  CreateUserData
} from '@/types'
import { ValidationError, AuthenticationError } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { JWTService } from './jwt.service'

export class AuthService {
  private jwtService: JWTService

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {
    this.jwtService = new JWTService(env, dbService)
  }





  async login(data: LoginRequest): Promise<{ user: User; tokens: TokenPair }> {
    // 1. 验证输入数据
    this.validateLoginData(data)

    // 2. 查找用户
    const user = await this.dbService.getUserByEmail(data.email)
    if (!user) {
      throw new AuthenticationError('邮箱或密码错误')
    }

    // 3. 检查用户是否为第三方登录用户
    if (user.provider !== 'email') {
      throw new AuthenticationError('该账户使用第三方登录，请使用对应的登录方式')
    }

    // 4. 验证密码
    if (!user.password_hash) {
      throw new AuthenticationError('该账户未设置密码，请使用第三方登录')
    }

    const isPasswordValid = await this.verifyPassword(data.password, user.password_hash)
    if (!isPasswordValid) {
      throw new AuthenticationError('邮箱或密码错误')
    }

    // 5. 检查用户状态
    if (!user.is_active) {
      throw new AuthenticationError('账户已被禁用')
    }

    // 6. 生成JWT token对
    const tokens = await this.jwtService.generateTokenPair(user)

    // 7. 记录日志
    await this.dbService.createLog({
      userId: user.id,
      action: 'LOGIN',
      details: `User logged in: ${user.email}`
    })

    // 7. 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user
    return {
      user: userWithoutPassword as User,
      tokens
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const tokens = await this.jwtService.refreshTokens(refreshToken)
    if (!tokens) {
      throw new AuthenticationError('无效的刷新令牌')
    }
    return tokens
  }

  async logout(refreshToken: string): Promise<void> {
    await this.jwtService.revokeRefreshToken(refreshToken)
  }

  async getCurrentUser(userId: number): Promise<User> {
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new AuthenticationError('用户不存在')
    }

    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }

  async logUserAction(userId: number, action: string, details: string): Promise<void> {
    await this.dbService.createLog({
      userId,
      action,
      details
    })
  }

  async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    // 1. 获取用户信息
    const user = await this.dbService.getUserById(userId)
    if (!user) {
      throw new AuthenticationError('用户不存在')
    }

    // 2. 检查用户是否有密码（第三方登录用户可能没有密码）
    if (!user.password_hash) {
      throw new AuthenticationError('该账户使用第三方登录，无法修改密码')
    }

    // 3. 验证当前密码
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('当前密码错误')
    }

    // 3. 验证新密码
    this.validatePassword(newPassword)

    // 4. 更新密码
    const newPasswordHash = await this.hashPassword(newPassword)
    await this.dbService.updateUserPassword(userId, newPasswordHash)

    // 5. 记录日志
    await this.dbService.createLog({
      userId,
      action: 'CHANGE_PASSWORD',
      details: 'User changed password'
    })
  }



  private validateLoginData(data: LoginRequest): void {
    if (!data.email || !data.password) {
      throw new ValidationError('邮箱和密码不能为空')
    }
  }

  private validatePassword(password: string): void {
    if (!password || password.length < 6) {
      throw new ValidationError('密码长度至少6位')
    }

    if (password.length > 128) {
      throw new ValidationError('密码长度不能超过128位')
    }

    // 可以添加更多密码复杂度验证
    // if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    //   throw new ValidationError('密码必须包含大小写字母和数字')
    // }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  private async hashPassword(password: string): Promise<string> {
    // 使用 Web Crypto API 实现 bcrypt 类似的功能
    const encoder = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const passwordData = encoder.encode(password)
    
    // 合并密码和盐
    const combined = new Uint8Array(passwordData.length + salt.length)
    combined.set(passwordData)
    combined.set(salt, passwordData.length)
    
    // 多次哈希以增加安全性
    let hash = await crypto.subtle.digest('SHA-256', combined)
    for (let i = 0; i < 10000; i++) {
      hash = await crypto.subtle.digest('SHA-256', hash)
    }
    
    // 将盐和哈希组合并编码为base64
    const result = new Uint8Array(salt.length + hash.byteLength)
    result.set(salt)
    result.set(new Uint8Array(hash), salt.length)
    
    return btoa(String.fromCharCode(...result))
  }

  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const passwordData = encoder.encode(password)
      
      // 解码存储的哈希
      const stored = Uint8Array.from(atob(hashedPassword), c => c.charCodeAt(0))
      const salt = stored.slice(0, 16)
      const storedHash = stored.slice(16)
      
      // 重新计算哈希
      const combined = new Uint8Array(passwordData.length + salt.length)
      combined.set(passwordData)
      combined.set(salt, passwordData.length)
      
      let hash = await crypto.subtle.digest('SHA-256', combined)
      for (let i = 0; i < 10000; i++) {
        hash = await crypto.subtle.digest('SHA-256', hash)
      }
      
      // 比较哈希
      const computedHash = new Uint8Array(hash)
      if (computedHash.length !== storedHash.length) {
        return false
      }
      
      for (let i = 0; i < computedHash.length; i++) {
        if (computedHash[i] !== storedHash[i]) {
          return false
        }
      }
      
      return true
    } catch (error) {
      console.error('Password verification error:', error)
      return false
    }
  }


}
