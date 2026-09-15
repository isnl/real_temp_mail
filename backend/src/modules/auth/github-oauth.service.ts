import type { Env, GitHubOAuthResponse, GitHubUser, User } from '@/types'
import { AppError, AuthenticationError, ValidationError } from '@/types'
import { DatabaseService } from '@/modules/shared/database.service'
import { SystemSettingsService } from '@/modules/settings/settings.service'
import { getGitHubCallbackUrl } from '@/utils/site-url'
import { decideOAuthEmailCollision } from './oauth-link-policy'

interface GitHubConfig {
  clientId: string
  clientSecret: string
  callbackUrl: string
}

const GITHUB_REQUEST_TIMEOUT_MS = 8_000

export class GitHubOAuthService {
  private readonly authUrl = 'https://github.com/login/oauth/authorize'
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token'
  private readonly userUrl = 'https://api.github.com/user'
  private readonly secureStateCookie = '__Host-github_oauth_state'
  private readonly localStateCookie = 'github_oauth_state'
  private settings: SystemSettingsService

  constructor(
    private env: Env,
    private dbService: DatabaseService
  ) {
    this.settings = new SystemSettingsService(env)
  }

  async createAuthorization(request: Request): Promise<{ url: string; cookie: string }> {
    const config = await this.getConfig(request.url)
    const state = await this.createState()
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: 'read:user user:email',
      state
    })
    return {
      url: `${this.authUrl}?${params.toString()}`,
      cookie: this.stateCookieHeader(state, request)
    }
  }

  async handleCallback(
    code: string,
    state: string | undefined,
    request: Request
  ): Promise<{ user: User; isNewUser: boolean }> {
    if (!state || !await this.validateState(state, request)) {
      throw new AuthenticationError('OAuth 状态无效或已过期，请重新登录')
    }

    const config = await this.getConfig(request.url)
    const accessToken = await this.exchangeCodeForToken(code, config)
    const githubUser = await this.fetchGitHubUser(accessToken)
    return await this.findOrCreateUser(githubUser)
  }

  clearStateCookie(request: Request): string {
    const secure = new URL(request.url).protocol === 'https:'
    return `${secure ? this.secureStateCookie : this.localStateCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`
  }

  private async getConfig(requestUrl: string): Promise<GitHubConfig> {
    if (!await this.settings.getBoolean('github_oauth_enabled')) {
      throw new ValidationError('GitHub 登录未启用')
    }
    const [clientId, clientSecret] = await Promise.all([
      this.settings.getValue('github_client_id'),
      this.settings.getValue('github_client_secret')
    ])
    if (!clientId || !clientSecret) {
      throw new AppError('GitHub 登录尚未正确配置', 503, 'OAUTH_NOT_CONFIGURED')
    }
    const callbackUrl = getGitHubCallbackUrl(this.env, requestUrl)
    return { clientId, clientSecret, callbackUrl }
  }

  private async exchangeCodeForToken(code: string, config: GitHubConfig): Promise<string> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.callbackUrl
      }),
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) throw new AuthenticationError('GitHub 授权服务暂时不可用')

    const data = await response.json() as GitHubOAuthResponse & {
      error?: string
      error_description?: string
    }
    if (!data.access_token || data.error) throw new AuthenticationError('GitHub 授权码无效或已使用')
    return data.access_token
  }

  private async fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch(this.userUrl, {
      headers: this.githubHeaders(accessToken),
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) throw new AuthenticationError('无法获取 GitHub 用户信息')
    const githubUser = await response.json() as GitHubUser
    if (!Number.isSafeInteger(githubUser.id) || !githubUser.login) {
      throw new AuthenticationError('GitHub 返回了无效的用户信息')
    }
    if (!githubUser.email) githubUser.email = await this.fetchGitHubUserEmail(accessToken)
    githubUser.email = githubUser.email.trim().toLowerCase()
    return githubUser
  }

  private async fetchGitHubUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: this.githubHeaders(accessToken),
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS)
    })
    if (!response.ok) throw new AuthenticationError('无法获取 GitHub 邮箱')
    const emails = await response.json() as Array<{
      email: string
      primary: boolean
      verified: boolean
      visibility?: string | null
    }>
    const selected = emails.find(email => email.primary && email.verified) ||
      emails.find(email => email.verified)
    if (!selected?.email) throw new AuthenticationError('GitHub 账户没有已验证邮箱')
    return selected.email
  }

  private githubHeaders(accessToken: string): HeadersInit {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Real-Temp-Mail'
    }
  }

  private async findOrCreateUser(githubUser: GitHubUser): Promise<{ user: User; isNewUser: boolean }> {
    const providerUserId = String(githubUser.id)
    let user = await this.dbService.getUserByProvider('github', providerUserId, true)
    if (user) {
      if (!user.is_active) throw new AuthenticationError('账户已被禁用')
      await Promise.all([
        this.dbService.updateUser(user.id, {
          avatar_url: githubUser.avatar_url || undefined,
          display_name: githubUser.name || githubUser.login
        }),
        this.dbService.linkOAuthAccount({
          userId: user.id,
          provider: 'github',
          providerUserId,
          providerEmail: githubUser.email
        })
      ])
      user = await this.dbService.getUserById(user.id)
      if (!user) throw new AuthenticationError('用户不存在')
      return { user, isNewUser: false }
    }

    const existingEmailUser = await this.dbService.getUserByEmail(githubUser.email, true)
    const emailDecision = decideOAuthEmailCollision(existingEmailUser)
    if (emailDecision === 'reject_disabled') {
      throw new AuthenticationError('账户已被禁用')
    }
    if (emailDecision === 'reject_unlinked') {
      // Registration currently does not verify ownership of an email address.
      // A matching address alone therefore cannot prove that the identities
      // belong to the same person: automatic linking would let a pre-created
      // password account capture a victim's first GitHub login. Only an
      // existing oauth_accounts link is accepted above.
      throw new AuthenticationError('该邮箱已存在，请先使用原账号登录；当前不支持自动绑定 GitHub')
    }

    if (!await this.settings.getBoolean('registration_enabled')) {
      throw new ValidationError('新用户注册当前已关闭')
    }
    const defaultQuota = Math.max(0, await this.settings.getInteger('default_user_quota'))
    const newUser = await this.dbService.createOAuthUserWithQuota({
      email: githubUser.email,
      provider: 'github',
      providerUserId,
      avatarUrl: githubUser.avatar_url || null,
      displayName: githubUser.name || githubUser.login,
      quota: defaultQuota
    })
    return { user: newUser, isNewUser: true }
  }

  private async createState(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    const payload = this.encodeText(JSON.stringify({
      nonce: crypto.randomUUID(),
      iat: now,
      exp: now + 10 * 60
    }))
    return `${payload}.${await this.signState(payload)}`
  }

  private async validateState(state: string, request: Request): Promise<boolean> {
    const cookieName = this.stateCookieName(request)
    if (state.length > 2048 || this.readCookie(request, cookieName) !== state) return false
    const [payload, signature] = state.split('.')
    if (!payload || !signature) return false
    const expected = await this.signState(payload)
    if (!this.timingSafeEqual(expected, signature)) return false
    try {
      const parsed = JSON.parse(this.decodeText(payload)) as { nonce?: unknown; iat?: unknown; exp?: unknown }
      const now = Math.floor(Date.now() / 1000)
      return typeof parsed.nonce === 'string' &&
        typeof parsed.iat === 'number' &&
        typeof parsed.exp === 'number' &&
        parsed.iat <= now + 60 &&
        parsed.exp >= now &&
        parsed.exp - parsed.iat <= 10 * 60
    } catch {
      return false
    }
  }

  private async signState(payload: string): Promise<string> {
    if (!this.env.JWT_SECRET || this.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters')
    }
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(this.env.JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    return this.encodeBytes(new Uint8Array(signature))
  }

  private stateCookieHeader(state: string, request: Request): string {
    const secure = new URL(request.url).protocol === 'https:'
    return `${secure ? this.secureStateCookie : this.localStateCookie}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? '; Secure' : ''}`
  }

  private stateCookieName(request: Request): string {
    return new URL(request.url).protocol === 'https:'
      ? this.secureStateCookie
      : this.localStateCookie
  }

  private readCookie(request: Request, name: string): string | undefined {
    for (const part of (request.headers.get('Cookie') || '').split(';')) {
      const [key, ...rest] = part.trim().split('=')
      if (key === name) return rest.join('=')
    }
    return undefined
  }

  private timingSafeEqual(left: string, right: string): boolean {
    if (left.length !== right.length) return false
    let difference = 0
    for (let index = 0; index < left.length; index++) {
      difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
    }
    return difference === 0
  }

  private encodeText(value: string): string {
    return this.encodeBytes(new TextEncoder().encode(value))
  }

  private encodeBytes(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  private decodeText(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '='))
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)))
  }
}
