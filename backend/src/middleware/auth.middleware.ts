import type { Env, JWTPayload, AuthenticationError, AuthorizationError } from '@/types'
import { JWTService } from '@/modules/auth/jwt.service'
import { DatabaseService } from '@/modules/shared/database.service'

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload
}

export function createAuthMiddleware(env: Env) {
  const dbService = new DatabaseService(env.DB)
  const jwtService = new JWTService(env, dbService)

  return {
    // 验证JWT token
    async authenticate(request: Request): Promise<{ request: AuthenticatedRequest; user: JWTPayload }> {
      const authHeader = request.headers.get('Authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Response(JSON.stringify({
          success: false,
          error: '缺少认证令牌'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const token = authHeader.substring(7) // 移除 'Bearer ' 前缀
      const payload = await jwtService.verifyJWT(token)

      if (!payload || payload.type !== 'access') {
        throw new Response(JSON.stringify({
          success: false,
          error: '无效的认证令牌'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 检查用户是否仍然存在且活跃
      const user = await dbService.getUserById(payload.userId)
      if (!user || !user.is_active) {
        throw new Response(JSON.stringify({
          success: false,
          error: '用户账户不存在或已被禁用'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // 将用户信息附加到请求对象
      const authenticatedRequest = request as AuthenticatedRequest
      authenticatedRequest.user = payload

      return { request: authenticatedRequest, user: payload }
    },

    // 验证管理员权限
    async requireAdmin(request: Request): Promise<{ request: AuthenticatedRequest; user: JWTPayload }> {
      const { request: authRequest, user } = await this.authenticate(request)

      if (user.role !== 'admin') {
        throw new Response(JSON.stringify({
          success: false,
          error: '需要管理员权限'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return { request: authRequest, user }
    },

    // 可选认证（不强制要求登录）
    async optionalAuth(request: Request): Promise<{ request: AuthenticatedRequest; user?: JWTPayload }> {
      try {
        const { request: authRequest, user } = await this.authenticate(request)
        return { request: authRequest, user }
      } catch (error) {
        // 认证失败时不抛出错误，只是不设置用户信息
        const authenticatedRequest = request as AuthenticatedRequest
        return { request: authenticatedRequest, user: undefined }
      }
    }
  }
}

// 创建认证装饰器函数
export function withAuth(env: Env) {
  const authMiddleware = createAuthMiddleware(env)

  return function authDecorator(
    handler: (request: AuthenticatedRequest, user: JWTPayload, env: Env) => Promise<Response>
  ) {
    return async function(request: Request): Promise<Response> {
      try {
        const { request: authRequest, user } = await authMiddleware.authenticate(request)
        return await handler(authRequest, user, env)
      } catch (error) {
        if (error instanceof Response) {
          return error
        }
        
        console.error('Auth middleware error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: '认证过程中发生错误'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

// 创建管理员权限装饰器函数
export function withAdminAuth(env: Env) {
  const authMiddleware = createAuthMiddleware(env)

  return function adminAuthDecorator(
    handler: (request: AuthenticatedRequest, user: JWTPayload, env: Env) => Promise<Response>
  ) {
    return async function(request: Request): Promise<Response> {
      try {
        const { request: authRequest, user } = await authMiddleware.requireAdmin(request)
        return await handler(authRequest, user, env)
      } catch (error) {
        if (error instanceof Response) {
          return error
        }
        
        console.error('Admin auth middleware error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: '权限验证过程中发生错误'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}

// 创建可选认证装饰器函数
export function withOptionalAuth(env: Env) {
  const authMiddleware = createAuthMiddleware(env)

  return function optionalAuthDecorator(
    handler: (request: AuthenticatedRequest, user: JWTPayload | undefined, env: Env) => Promise<Response>
  ) {
    return async function(request: Request): Promise<Response> {
      try {
        const { request: authRequest, user } = await authMiddleware.optionalAuth(request)
        return await handler(authRequest, user, env)
      } catch (error) {
        console.error('Optional auth middleware error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: '认证过程中发生错误'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }
}
