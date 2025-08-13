import type { Env, LoginRequest, RegisterRequest, SendVerificationCodeRequest, ApiResponse } from '@/types'
import { AuthService } from '@/modules/auth/auth.service'
import { DatabaseService } from '@/modules/shared/database.service'
import { withAuth, type AuthenticatedRequest } from '@/middleware/auth.middleware'
import { withRateLimit } from '@/middleware/ratelimit.middleware'
import type { JWTPayload } from '@/types'

export class AuthHandler {
  private authService: AuthService
  public getCurrentUser: (request: Request) => Promise<Response>
  public changePassword: (request: Request) => Promise<Response>
  public register: (request: Request) => Promise<Response>
  public login: (request: Request) => Promise<Response>
  public sendVerificationCode: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    const dbService = new DatabaseService(env.DB)
    this.authService = new AuthService(env, dbService)

    // 初始化需要认证的方法
    this.getCurrentUser = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetCurrentUser(request, user)
    })

    this.changePassword = withAuth(this.env)(withRateLimit(this.env, '/api/auth/change-password')((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleChangePassword(request, user)
    }))

    // 初始化需要限流的公开方法
    this.register = withRateLimit(this.env, '/api/auth/register')((request: Request) => {
      return this.handleRegister(request)
    })

    this.login = withRateLimit(this.env, '/api/auth/login')((request: Request) => {
      return this.handleLogin(request)
    })

    this.sendVerificationCode = withRateLimit(this.env, '/api/auth/send-verification-code')((request: Request) => {
      return this.handleSendVerificationCode(request)
    })
  }

  private async handleRegister(request: Request): Promise<Response> {
    try {
      const data: RegisterRequest = await request.json()

      // 注册用户
      const result = await this.authService.register(data)

      return this.successResponse(result, '注册成功')
    } catch (error: any) {
      console.error('Register error:', error)
      return this.errorResponse(error.message || '注册失败', error.statusCode || 500)
    }
  }

  private async handleLogin(request: Request): Promise<Response> {
    try {
      const data: LoginRequest = await request.json()

      // 用户登录
      const result = await this.authService.login(data)

      return this.successResponse(result, '登录成功')
    } catch (error: any) {
      console.error('Login error:', error)
      return this.errorResponse(error.message || '登录失败', error.statusCode || 500)
    }
  }

  private async handleSendVerificationCode(request: Request): Promise<Response> {
    try {
      const data: SendVerificationCodeRequest = await request.json()

      // 发送验证码
      const result = await this.authService.sendVerificationCode(data)

      return this.successResponse(result, '验证码发送成功')
    } catch (error: any) {
      console.error('Send verification code error:', error)
      return this.errorResponse(error.message || '验证码发送失败', error.statusCode || 500)
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

      await this.authService.changePassword(user.userId, currentPassword, newPassword)

      return this.successResponse(null, '密码修改成功')
    } catch (error: any) {
      console.error('Change password error:', error)
      return this.errorResponse(error.message || '密码修改失败', error.statusCode || 500)
    }
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
