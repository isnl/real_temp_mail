import type { 
  Env, 
  CheckinRequest,
  JWTPayload,
  AuthenticatedRequest
} from '@/types'

import { 
  ValidationError,
  AuthenticationError
} from '@/types'

import { CheckinService } from '@/modules/checkin/checkin.service'
import { withAuth } from '@/middleware/auth.middleware'

export class CheckinHandler {
  private checkinService: CheckinService
  public checkin: (request: Request) => Promise<Response>
  public getCheckinStatus: (request: Request) => Promise<Response>
  public getCheckinHistory: (request: Request) => Promise<Response>
  public getCheckinStats: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    this.checkinService = new CheckinService(env)

    // 初始化需要认证的方法
    this.checkin = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleCheckin(request, user)
    })

    this.getCheckinStatus = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetCheckinStatus(request, user)
    })

    this.getCheckinHistory = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetCheckinHistory(request, user)
    })

    this.getCheckinStats = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetCheckinStats(request, user)
    })
  }

  /**
   * 处理用户签到
   */
  private async handleCheckin(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      // 签到不需要额外的请求数据，但传递request对象以获取IP地址
      const result = await this.checkinService.checkin(user.userId, request)
      return this.successResponse(result, result.message)
    } catch (error: any) {
      console.error('Checkin error:', error)
      return this.errorResponse(error.message || '签到失败', error.statusCode || 500)
    }
  }

  /**
   * 获取签到状态
   */
  private async handleGetCheckinStatus(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const status = await this.checkinService.getCheckinStatus(user.userId)
      return this.successResponse(status)
    } catch (error: any) {
      console.error('Get checkin status error:', error)
      return this.errorResponse(error.message || '获取签到状态失败', error.statusCode || 500)
    }
  }

  /**
   * 获取签到历史
   */
  private async handleGetCheckinHistory(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const limit = parseInt(url.searchParams.get('limit') || '30')
      
      const history = await this.checkinService.getCheckinHistory(user.userId, limit)
      return this.successResponse(history)
    } catch (error: any) {
      console.error('Get checkin history error:', error)
      return this.errorResponse(error.message || '获取签到历史失败', error.statusCode || 500)
    }
  }

  /**
   * 获取签到统计
   */
  private async handleGetCheckinStats(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const stats = await this.checkinService.getCheckinStats(user.userId)
      return this.successResponse(stats)
    } catch (error: any) {
      console.error('Get checkin stats error:', error)
      return this.errorResponse(error.message || '获取签到统计失败', error.statusCode || 500)
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
