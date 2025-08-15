import type { Env, LoginRequest, GitHubOAuthRequest, ApiResponse } from '@/types'
import { AuthService } from '@/modules/auth/auth.service'
import { GitHubOAuthService } from '@/modules/auth/github-oauth.service'
import { DatabaseService } from '@/modules/shared/database.service'
import { JWTService } from '@/modules/auth/jwt.service'
import { withAuth, type AuthenticatedRequest } from '@/middleware/auth.middleware'
import { withRateLimit } from '@/middleware/ratelimit.middleware'
import type { JWTPayload } from '@/types'

export class AuthHandler {
  private authService: AuthService
  private githubOAuthService: GitHubOAuthService
  private jwtService: JWTService

  public getCurrentUser: (request: Request) => Promise<Response>
  public changePassword: (request: Request) => Promise<Response>
  public login: (request: Request) => Promise<Response>

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
  }

  private async handleLogin(request: Request): Promise<Response> {
    try {
      const data: LoginRequest = await request.json()

      // 用户登录（传递request对象以获取IP地址）
      const result = await this.authService.login(data, request)

      return this.successResponse(result, '登录成功')
    } catch (error: any) {
      console.error('Login error:', error)
      return this.errorResponse(error.message || '登录失败', error.statusCode || 500)
    }
  }

  // GitHub OAuth 相关方法
  async githubAuth(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const state = url.searchParams.get('state') || undefined

      const authUrl = this.githubOAuthService.generateAuthUrl(state)

      return Response.redirect(authUrl, 302)
    } catch (error: any) {
      console.error('GitHub auth error:', error)
      return this.errorResponse(error.message || 'GitHub授权失败', error.statusCode || 500)
    }
  }

  async githubCallback(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (!code) {
        return this.errorResponse('缺少授权码', 400)
      }

      // 处理GitHub OAuth回调
      const { user, isNewUser } = await this.githubOAuthService.handleCallback(code, state || undefined)

      // 生成JWT token对
      const tokens = await this.jwtService.generateTokenPair(user)

      // 记录登录日志（传递request对象以获取IP地址）
      await this.authService.logUserAction(user.id, isNewUser ? 'GITHUB_REGISTER' : 'GITHUB_LOGIN',
        `User ${isNewUser ? 'registered' : 'logged in'} via GitHub: ${user.email}`, request)

      // 构建前端重定向URL，携带token信息
      const frontendUrl = this.getFrontendUrl()
      const redirectUrl = new URL('/auth/callback', frontendUrl)
      redirectUrl.searchParams.set('token', tokens.accessToken)
      redirectUrl.searchParams.set('refresh_token', tokens.refreshToken)

      if (isNewUser) {
        redirectUrl.searchParams.set('new_user', '1')
      }

      return Response.redirect(redirectUrl.toString(), 302)
    } catch (error: any) {
      console.error('GitHub callback error:', error)

      // 重定向到前端错误页面
      const frontendUrl = this.getFrontendUrl()
      const errorUrl = new URL('/login', frontendUrl)
      errorUrl.searchParams.set('error', encodeURIComponent(error.message || 'GitHub登录失败'))

      return Response.redirect(errorUrl.toString(), 302)
    }
  }

  async refreshToken(request: Request): Promise<Response> {
    try {
      const { refreshToken } = await request.json() as any

      if (!refreshToken) {
        return this.errorResponse('缺少刷新令牌', 400)
      }

      const tokens = await this.authService.refreshTokens(refreshToken)

      return this.successResponse(tokens, '令牌刷新成功')
    } catch (error: any) {
      console.error('Refresh token error:', error)
      return this.errorResponse(error.message || '令牌刷新失败', error.statusCode || 401)
    }
  }

  async logout(request: Request): Promise<Response> {
    try {
      const { refreshToken } = await request.json() as any

      if (refreshToken) {
        await this.authService.logout(refreshToken)
      }

      return this.successResponse(null, '登出成功')
    } catch (error: any) {
      console.error('Logout error:', error)
      return this.errorResponse(error.message || '登出失败', error.statusCode || 500)
    }
  }

  // 需要认证的路由处理器已在构造函数中初始化

  private async handleGetCurrentUser(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const currentUser = await this.authService.getCurrentUser(user.userId)
      return this.successResponse(currentUser)
    } catch (error: any) {
      console.error('Get current user error:', error)
      return this.errorResponse(error.message || '获取用户信息失败', error.statusCode || 500)
    }
  }

  private async handleChangePassword(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const { currentPassword, newPassword, confirmPassword } = await request.json() as any

      if (!currentPassword || !newPassword || !confirmPassword) {
        return this.errorResponse('缺少必要参数', 400)
      }

      if (newPassword !== confirmPassword) {
        return this.errorResponse('新密码确认不一致', 400)
      }

      await this.authService.changePassword(user.userId, currentPassword, newPassword, request)

      return this.successResponse(null, '密码修改成功')
    } catch (error: any) {
      console.error('Change password error:', error)
      return this.errorResponse(error.message || '密码修改失败', error.statusCode || 500)
    }
  }

  private getFrontendUrl(): string {
    return this.env.ENVIRONMENT === 'production'
      ? `https://${this.env.FRONTEND_DOMAIN}`
      : `http://${this.env.FRONTEND_DOMAIN}` // 开发环境前端地址
  }

  private successResponse<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  private errorResponse(error: string, status: number = 500): Response {
    const response: ApiResponse = {
      success: false,
      error
    }

    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
}
