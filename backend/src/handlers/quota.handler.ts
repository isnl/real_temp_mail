import type { 
  Env, 
  JWTPayload,
  AuthenticatedRequest
} from '@/types'

import { DatabaseService } from '@/modules/shared/database.service'
import { withAuth } from '@/middleware/auth.middleware'

export class QuotaHandler {
  private dbService: DatabaseService
  public getQuotaLogs: (request: Request) => Promise<Response>
  public getQuotaInfo: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    this.dbService = new DatabaseService(env.DB)

    // 初始化需要认证的方法
    this.getQuotaLogs = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetQuotaLogs(request, user)
    })

    this.getQuotaInfo = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetQuotaInfo(request, user)
    })
  }

  /**
   * 获取用户配额记录
   */
  private async handleGetQuotaLogs(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '20')

      const result = await this.dbService.getUserQuotaLogs(user.userId, page, limit)
      return this.successResponse(result)
    } catch (error: any) {
      console.error('Get quota logs error:', error)
      return this.errorResponse(error.message || '获取配额记录失败', error.statusCode || 500)
    }
  }

  /**
   * 获取用户配额信息
   */
  private async handleGetQuotaInfo(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      // 先清理过期配额
      await this.dbService.cleanupExpiredQuotas()

      // 使用新的配额系统获取配额信息
      const quotaData = await this.dbService.getUserTotalQuota(user.userId)
      const usedQuota = await this.dbService.getUsedQuotaFromLogs(user.userId)
      const expiringQuotas = await this.dbService.getExpiringQuotas(user.userId)

      const quotaInfo = {
        remaining: quotaData.available, // 可用配额（不包括过期的）
        used: usedQuota, // 已使用配额
        total: quotaData.total, // 总配额（包括过期的）
        expired: quotaData.expired, // 已过期配额
        expiring: expiringQuotas.reduce((sum, quota) => sum + quota.amount, 0) // 即将过期的配额总量
      }

      return this.successResponse(quotaInfo)
    } catch (error: any) {
      console.error('Get quota info error:', error)
      return this.errorResponse(error.message || '获取配额信息失败', error.statusCode || 500)
    }
  }

  /**
   * 成功响应
   */
  private successResponse(data: any, message?: string): Response {
    return new Response(JSON.stringify({
      success: true,
      data,
      message
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  /**
   * 错误响应
   */
  private errorResponse(message: string, status: number = 500): Response {
    return new Response(JSON.stringify({
      success: false,
      error: message
    }), {
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
