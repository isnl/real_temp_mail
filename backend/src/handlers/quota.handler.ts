import type { 
  Env, 
  JWTPayload,
  AuthenticatedRequest
} from '@/types'

import { DatabaseService } from '@/modules/shared/database.service'
import { withAuth } from '@/middleware/auth.middleware'
import { normalizeApiTimestamps } from '@/utils/datetime'
import { AppError } from '@/types'

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
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      const requestedLimit = Number(url.searchParams.get('limit') ?? 20)
      const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
      const limit = Number.isSafeInteger(requestedLimit)
        ? Math.min(100, Math.max(1, requestedLimit))
        : 20

      const result = await this.dbService.getUserQuotaLogs(user.userId, page, limit)
      return this.successResponse(result)
    } catch (error: unknown) {
      console.error('Get quota logs error:', error)
      return this.exceptionResponse(error, '获取配额记录失败')
    }
  }

  /**
   * 获取用户配额信息
   */
  private async handleGetQuotaInfo(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const quotaData = await this.dbService.getQuotaOverview(user.userId)

      const quotaInfo = {
        remaining: quotaData.available, // 可用配额（不包括过期的）
        used: quotaData.used,
        total: quotaData.total, // 总配额（包括过期的）
        expired: quotaData.expired, // 已过期配额
        expiring: quotaData.expiring
      }

      return this.successResponse(quotaInfo)
    } catch (error: unknown) {
      console.error('Get quota info error:', error)
      return this.exceptionResponse(error, '获取配额信息失败')
    }
  }

  /**
   * 成功响应
   */
  private successResponse(data: any, message?: string): Response {
    return new Response(JSON.stringify(normalizeApiTimestamps({
      success: true,
      data,
      message
    })), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
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
        'Content-Type': 'application/json'
      }
    })
  }

  private exceptionResponse(error: unknown, fallback: string): Response {
    if (error instanceof AppError) {
      return this.errorResponse(error.message, error.statusCode)
    }
    return this.errorResponse(fallback, 500)
  }
}
