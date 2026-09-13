import type {
  AdminBootstrapRequest,
  ApiResponse,
  Env,
  LoginRequest,
  RegisterRequest
} from '@/types'
import { AuthService } from '@/modules/auth/auth.service'
import { GitHubOAuthService } from '@/modules/auth/github-oauth.service'
import { DatabaseService } from '@/modules/shared/database.service'
import { JWTService } from '@/modules/auth/jwt.service'
import { withAuth, type AuthenticatedRequest } from '@/middleware/auth.middleware'
import { withRateLimit } from '@/middleware/ratelimit.middleware'
import { AppError, ValidationError, type JWTPayload } from '@/types'
import { normalizeApiTimestamps } from '@/utils/datetime'

export class AuthHandler {
  private authService: AuthService
  private githubOAuthService: GitHubOAuthService
  private jwtService: JWTService

  public getCurrentUser: (request: Request) => Promise<Response>
  public changePassword: (request: Request) => Promise<Response>
  public login: (request: Request) => Promise<Response>
  public register: (request: Request) => Promise<Response>
  public bootstrapAdmin: (request: Request) => Promise<Response>
  public githubAuth: (request: Request) => Promise<Response>
  public githubCallback: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    const dbService = new DatabaseService(env.DB)
    this.authService = new AuthService(env, dbService)
    this.githubOAuthService = new GitHubOAuthService(env, dbService)
    this.jwtService = new JWTService(env, dbService)

    // 初始化需要认证的方法
    this.getCurrentUser = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetCurrentUser(request, user)
    })

    this.changePassword = withAuth(this.env)(withRateLimit(this.env, '/api/auth/change-password')((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleChangePassword(request, user)
    }))

    // 初始化需要限流的公开方法
    this.login = withRateLimit(this.env, '/api/auth/login')((request: Request) => {
      return this.handleLogin(request)
    })
    this.register = withRateLimit(this.env, '/api/auth/register')((request: Request) => {
      return this.handleRegister(request)
    })
    this.bootstrapAdmin = withRateLimit(this.env, '/api/auth/bootstrap')((request: Request) => {
      return this.handleBootstrapAdmin(request)
    })
    this.githubAuth = withRateLimit(this.env, '/api/auth/github')((request: Request) => {
      return this.handleGithubAuth(request)
    })
    this.githubCallback = withRateLimit(this.env, '/api/auth/github/callback')((request: Request) => {
      return this.handleGithubCallback(request)
    })
  }

  private async handleLogin(request: Request): Promise<Response> {
    try {
      const data = await this.parseJson<LoginRequest>(request)

      // 用户登录（传递request对象以获取IP地址）
      const result = await this.authService.login(data, request)

      return this.successResponse(result, '登录成功')
    } catch (error: any) {
      console.error('Login error:', error)
      return this.exceptionResponse(error, '登录失败')
    }
  }

  private async handleRegister(request: Request): Promise<Response> {
    try {
      const data = await this.parseJson<RegisterRequest>(request)
      return this.successResponse(await this.authService.register(data, request), '注册成功', 201)
    } catch (error: any) {
      console.error('Register error:', error)
      return this.exceptionResponse(error, '注册失败')
    }
  }

  private async handleBootstrapAdmin(request: Request): Promise<Response> {
    try {
      const data = await this.parseJson<AdminBootstrapRequest>(request)
      return this.successResponse(await this.authService.bootstrapAdmin(data, request), '管理员初始化成功')
    } catch (error: any) {
      console.error('Admin bootstrap error:', error)
      return this.exceptionResponse(error, '管理员初始化失败')
    }
  }

  async getBootstrapStatus(): Promise<Response> {
    try {
      return this.successResponse({ required: await this.authService.isAdminSetupRequired() })
    } catch (error: any) {
      console.error('Admin bootstrap status error:', error)
      return this.errorResponse('无法获取管理员初始化状态', 500)
    }
  }

  // GitHub OAuth 相关方法
  private async handleGithubAuth(request: Request): Promise<Response> {
    try {
      const authorization = await this.githubOAuthService.createAuthorization(request)
      return new Response(null, {
        status: 302,
        headers: { Location: authorization.url, 'Set-Cookie': authorization.cookie }
      })
    } catch (error: any) {
      console.error('GitHub auth error:', error)
      return this.exceptionResponse(error, 'GitHub授权失败')
    }
  }

  private async handleGithubCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (!code) {
        return this.errorResponse('缺少授权码', 400)
      }

      // 处理GitHub OAuth回调
      const { user, isNewUser } = await this.githubOAuthService.handleCallback(
        code,
        state || undefined,
        request
      )

      // 生成JWT token对
      const tokens = await this.jwtService.generateTokenPair(user)

      // 记录登录日志（传递request对象以获取IP地址）
      await this.authService.logUserAction(user.id, isNewUser ? 'GITHUB_REGISTER' : 'GITHUB_LOGIN',
        `User ${isNewUser ? 'registered' : 'logged in'} via GitHub: ${user.email}`, request)

      // 构建前端重定向URL，携带token信息
      const frontendUrl = this.getFrontendUrl(request)
      const redirectUrl = new URL('/auth/callback', frontendUrl)
      const fragment = new URLSearchParams({
        token: tokens.accessToken,
        refresh_token: tokens.refreshToken
      })
      if (isNewUser) fragment.set('new_user', '1')
      redirectUrl.hash = fragment.toString()

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
          'Set-Cookie': this.githubOAuthService.clearStateCookie(request),
          'Cache-Control': 'no-store'
        }
      })
    } catch (error: any) {
      console.error('GitHub callback error:', error)

      // 重定向到前端错误页面
      const frontendUrl = this.getFrontendUrl(request)
      const errorUrl = new URL('/login', frontendUrl)
      errorUrl.searchParams.set('error', 'github_oauth_failed')

      return new Response(null, {
        status: 302,
        headers: {
          Location: errorUrl.toString(),
          'Set-Cookie': this.githubOAuthService.clearStateCookie(request),
          'Cache-Control': 'no-store'
        }
      })
    }
  }

  async refreshToken(request: Request): Promise<Response> {
    try {
      const { refreshToken } = await this.parseJson<{ refreshToken?: unknown }>(request)

      if (typeof refreshToken !== 'string' || !refreshToken || refreshToken.length > 4096) {
        return this.errorResponse('缺少刷新令牌', 400)
      }

      const tokens = await this.authService.refreshTokens(refreshToken)

      return this.successResponse(tokens, '令牌刷新成功')
    } catch (error: any) {
      console.error('Refresh token error:', error)
      return this.exceptionResponse(error, '令牌刷新失败', 401)
    }
  }

  async logout(request: Request): Promise<Response> {
    try {
      const { refreshToken } = await this.parseJson<{ refreshToken?: unknown }>(request)

      if (typeof refreshToken === 'string' && refreshToken && refreshToken.length <= 4096) {
        await this.authService.logout(refreshToken)
      } else if (refreshToken !== undefined && refreshToken !== null && refreshToken !== '') {
        return this.errorResponse('刷新令牌格式无效', 400)
      }

      return this.successResponse(null, '登出成功')
    } catch (error: any) {
      console.error('Logout error:', error)
      return this.exceptionResponse(error, '登出失败')
    }
  }

  // 需要认证的路由处理器已在构造函数中初始化

  private async handleGetCurrentUser(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const currentUser = await this.authService.getCurrentUser(user.userId)
      return this.successResponse(currentUser)
    } catch (error: any) {
      console.error('Get current user error:', error)
      return this.exceptionResponse(error, '获取用户信息失败')
    }
  }

  private async handleChangePassword(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const { currentPassword, newPassword, confirmPassword } = await this.parseJson<{
        currentPassword?: unknown
        newPassword?: unknown
        confirmPassword?: unknown
      }>(request)

      if (
        typeof currentPassword !== 'string' ||
        typeof newPassword !== 'string' ||
        typeof confirmPassword !== 'string' ||
        !currentPassword || !newPassword || !confirmPassword
      ) {
        return this.errorResponse('缺少必要参数', 400)
      }

      if (newPassword !== confirmPassword) {
        return this.errorResponse('新密码确认不一致', 400)
      }

      await this.authService.changePassword(user.userId, currentPassword, newPassword, request)

      return this.successResponse(null, '密码修改成功')
    } catch (error: any) {
      console.error('Change password error:', error)
      return this.exceptionResponse(error, '密码修改失败')
    }
  }

  private getFrontendUrl(request: Request): string {
    if (!this.env.FRONTEND_DOMAIN) return new URL(request.url).origin
    if (/^https?:\/\//.test(this.env.FRONTEND_DOMAIN)) return this.env.FRONTEND_DOMAIN
    return `${this.env.ENVIRONMENT === 'production' ? 'https' : 'http'}://${this.env.FRONTEND_DOMAIN}`
  }

  private async parseJson<T>(request: Request): Promise<T> {
    try {
      const value = JSON.parse(await this.readBoundedBody(request, 16 * 1024))
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ValidationError('请求体必须是 JSON 对象')
      }
      return value as T
    } catch (error) {
      if (error instanceof ValidationError) throw error
      throw new ValidationError('请求体必须是有效 JSON')
    }
  }

  private async readBoundedBody(request: Request, maximumBytes: number): Promise<string> {
    const declaredLength = request.headers.get('Content-Length')
    if (declaredLength && Number(declaredLength) > maximumBytes) {
      throw new ValidationError('请求体过大')
    }
    if (!request.body) throw new ValidationError('请求体不能为空')

    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maximumBytes) {
        await reader.cancel()
        throw new ValidationError('请求体过大')
      }
      chunks.push(value)
    }

    const body = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(body)
  }

  private successResponse<T>(data: T, message?: string, status = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    }

    return new Response(JSON.stringify(normalizeApiTimestamps(response)), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  private exceptionResponse(
    error: unknown,
    fallbackMessage: string,
    fallbackStatus = 500
  ): Response {
    if (error instanceof Response) return error
    if (error instanceof AppError) {
      return this.errorResponse(error.message, error.statusCode)
    }
    return this.errorResponse(fallbackMessage, fallbackStatus)
  }

  private errorResponse(error: string, status: number = 500): Response {
    const response: ApiResponse = {
      success: false,
      error
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}
