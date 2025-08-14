import type { Env, GitHubUser, GitHubOAuthResponse, User, CreateUserData } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { ValidationError, AuthenticationError } from '@/types'

export class GitHubOAuthService {
  private readonly GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
  private readonly GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
  private readonly GITHUB_USER_URL = 'https://api.github.com/user'

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {}

  /**
   * 生成GitHub OAuth授权URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.env.GITHUB_CLIENT_ID,
      redirect_uri: `${this.getBaseUrl()}/api/auth/github/callback`,
      scope: 'user:email',
      state: state || this.generateState()
    })

    return `${this.GITHUB_AUTH_URL}?${params.toString()}`
  }

  /**
   * 处理GitHub OAuth回调
   */
  async handleCallback(code: string, state?: string): Promise<{ user: User; isNewUser: boolean }> {
    try {
      // 1. 用授权码换取访问令牌
      const accessToken = await this.exchangeCodeForToken(code)

      // 2. 使用访问令牌获取用户信息
      const githubUser = await this.fetchGitHubUser(accessToken)

      // 3. 查找或创建用户
      const result = await this.findOrCreateUser(githubUser)

      return result
    } catch (error: any) {
      console.error('GitHub OAuth callback error:', error)
      throw new AuthenticationError('GitHub登录失败: ' + error.message)
    }
  }

  /**
   * 用授权码换取访问令牌
   */
  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(this.GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.env.GITHUB_CLIENT_ID,
        client_secret: this.env.GITHUB_CLIENT_SECRET,
        code: code,
      }),
    })

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.status}`)
    }

    const data: GitHubOAuthResponse = await response.json()
    
    if (!data.access_token) {
      throw new Error('No access token received from GitHub')
    }

    return data.access_token
  }

  /**
   * 使用访问令牌获取GitHub用户信息
   */
  private async fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(this.GITHUB_USER_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TempMail-App'
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub user fetch failed: ${response.status}`)
    }

    const githubUser: GitHubUser = await response.json()

    // 验证必需的字段
    if (!githubUser.id || !githubUser.login) {
      throw new Error('Invalid GitHub user data received')
    }

    // 如果GitHub用户没有公开邮箱，我们需要获取邮箱列表
    if (!githubUser.email) {
      githubUser.email = await this.fetchGitHubUserEmail(accessToken)
    }

    return githubUser
  }

  /**
   * 获取GitHub用户的邮箱地址
   */
  private async fetchGitHubUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TempMail-App'
      },
    })

    if (!response.ok) {
      throw new Error(`GitHub email fetch failed: ${response.status}`)
    }

    const emails: Array<{ email: string; primary: boolean; verified: boolean }> = await response.json()
    
    // 查找主要且已验证的邮箱
    const primaryEmail = emails.find(e => e.primary && e.verified)
    if (primaryEmail) {
      return primaryEmail.email
    }

    // 如果没有主要邮箱，查找任何已验证的邮箱
    const verifiedEmail = emails.find(e => e.verified)
    if (verifiedEmail) {
      return verifiedEmail.email
    }

    throw new Error('No verified email found in GitHub account')
  }

  /**
   * 查找或创建用户
   */
  private async findOrCreateUser(githubUser: GitHubUser): Promise<{ user: User; isNewUser: boolean }> {
    // 1. 首先尝试通过GitHub ID查找用户
    let user = await this.dbService.getUserByProvider('github', githubUser.id.toString())
    
    if (user) {
      // 更新用户信息（头像、显示名称等可能会变化）
      await this.updateUserFromGitHub(user.id, githubUser)
      const updatedUser = await this.dbService.getUserById(user.id)
      return { user: updatedUser!, isNewUser: false }
    }

    // 2. 检查是否已有相同邮箱的用户（可能是邮箱注册的用户）
    const existingEmailUser = await this.dbService.getUserByEmail(githubUser.email)
    if (existingEmailUser && existingEmailUser.provider === 'email') {
      // 将现有邮箱用户关联到GitHub账户
      await this.linkGitHubToExistingUser(existingEmailUser.id, githubUser)
      const updatedUser = await this.dbService.getUserById(existingEmailUser.id)
      return { user: updatedUser!, isNewUser: false }
    }

    // 3. 创建新用户
    const newUser = await this.createGitHubUser(githubUser)
    return { user: newUser, isNewUser: true }
  }

  /**
   * 创建GitHub用户
   */
  private async createGitHubUser(githubUser: GitHubUser): Promise<User> {
    // 获取注册默认配额设置
    const defaultQuotaSetting = await this.dbService.getSystemSetting('default_user_quota')
    const defaultQuota = parseInt(defaultQuotaSetting?.setting_value || '5')

    const userData: CreateUserData = {
      email: githubUser.email,
      provider: 'github',
      provider_id: githubUser.id.toString(),
      avatar_url: githubUser.avatar_url,
      display_name: githubUser.name || githubUser.login,
      quota: defaultQuota,
      role: 'user'
    }

    const user = await this.dbService.createUser(userData)

    // 创建注册配额余额记录（永不过期）
    await this.dbService.createQuotaBalance({
      userId: user.id,
      quotaType: 'permanent',
      amount: defaultQuota,
      expiresAt: null,
      source: 'register', // 保持与邮箱注册一致
      sourceId: null
    })

    // 创建注册配额记录
    await this.dbService.createQuotaLog({
      userId: user.id,
      type: 'earn',
      amount: defaultQuota,
      source: 'register',
      description: 'GitHub登录注册赠送配额（永不过期）',
      expiresAt: null,
      quotaType: 'permanent'
    })

    // 记录日志
    await this.dbService.createLog({
      userId: user.id,
      action: 'GITHUB_REGISTER',
      details: `User registered via GitHub: ${user.email} (${githubUser.login})`
    })

    return user
  }

  /**
   * 更新用户的GitHub信息
   */
  private async updateUserFromGitHub(userId: number, githubUser: GitHubUser): Promise<void> {
    await this.dbService.updateUser(userId, {
      avatar_url: githubUser.avatar_url,
      display_name: githubUser.name || githubUser.login,
      email: githubUser.email // 邮箱也可能会变化
    })
  }

  /**
   * 将GitHub账户关联到现有用户
   */
  private async linkGitHubToExistingUser(userId: number, githubUser: GitHubUser): Promise<void> {
    await this.dbService.updateUser(userId, {
      provider: 'github',
      provider_id: githubUser.id.toString(),
      avatar_url: githubUser.avatar_url,
      display_name: githubUser.name || githubUser.login
    })

    // 记录日志
    await this.dbService.createLog({
      userId: userId,
      action: 'GITHUB_LINK',
      details: `Existing user linked to GitHub: ${githubUser.login}`
    })
  }

  /**
   * 生成随机状态字符串
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * 获取基础URL
   */
  private getBaseUrl(): string {
    return this.env.ENVIRONMENT === 'production' 
      ? `https://${this.env.BASE_DOMAIN}`
      : 'http://localhost:8787'
  }
}
