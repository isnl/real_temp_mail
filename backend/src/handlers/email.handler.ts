import type { 
  Env, 
  CreateEmailRequest, 
  RedeemRequest, 
  ApiResponse,
  PaginationParams 
} from '@/types'
import { EmailService } from '@/modules/email/email.service'
import { DatabaseService } from '@/modules/shared/database.service'
import { TurnstileService } from '@/middleware/turnstile.middleware'
import { withAuth, type AuthenticatedRequest } from '@/middleware/auth.middleware'
import type { JWTPayload } from '@/types'

export class EmailHandler {
  private emailService: EmailService
  private turnstileService: TurnstileService
  public createTempEmail: (request: Request) => Promise<Response>
  public getTempEmails: (request: Request) => Promise<Response>
  public deleteTempEmail: (request: Request) => Promise<Response>
  public getEmailsForTempEmail: (request: Request) => Promise<Response>
  public deleteEmail: (request: Request) => Promise<Response>
  public redeemCode: (request: Request) => Promise<Response>
  public getQuotaInfo: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    const dbService = new DatabaseService(env.DB)
    this.emailService = new EmailService(env, dbService)
    this.turnstileService = new TurnstileService(env)

    // 初始化需要认证的方法
    this.createTempEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleCreateTempEmail(request, user)
    })

    this.getTempEmails = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetTempEmails(request, user)
    })

    this.deleteTempEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleDeleteTempEmail(request, user)
    })

    this.getEmailsForTempEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetEmailsForTempEmail(request, user)
    })

    this.deleteEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleDeleteEmail(request, user)
    })

    this.redeemCode = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleRedeemCode(request, user)
    })

    this.getQuotaInfo = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetQuotaInfo(request, user)
    })
  }

  // 需要认证的路由处理器已在构造函数中初始化

  // 公开路由
  async getDomains(request: Request): Promise<Response> {
    try {
      const domains = await this.emailService.getActiveDomains()
      return this.successResponse(domains)
    } catch (error: any) {
      console.error('Get domains error:', error)
      return this.errorResponse(error.message || '获取域名列表失败', error.statusCode || 500)
    }
  }

  // 邮件接收处理（由Email Routing触发）
  async handleIncomingEmail(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      const recipientEmail = url.searchParams.get('to')
      
      if (!recipientEmail) {
        return this.errorResponse('缺少收件人邮箱', 400)
      }

      const rawEmail = await request.arrayBuffer()
      await this.emailService.handleIncomingEmail(rawEmail, recipientEmail)

      return this.successResponse(null, '邮件处理成功')
    } catch (error: any) {
      console.error('Handle incoming email error:', error)
      return this.errorResponse(error.message || '邮件处理失败', error.statusCode || 500)
    }
  }

  private async handleCreateTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const data: CreateEmailRequest = await request.json()

      // 验证Turnstile
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For')
      
      const isTurnstileValid = await this.turnstileService.verifyToken(
        data.turnstileToken, 
        clientIP || undefined
      )

      if (!isTurnstileValid) {
        return this.errorResponse('人机验证失败', 400)
      }

      const tempEmail = await this.emailService.createTempEmail(user.userId, data)

      // 获取用户最新配额信息
      const updatedUser = await this.emailService.getUserById(user.userId)

      return this.successResponse({
        tempEmail,
        userQuota: updatedUser?.quota || 0
      }, '临时邮箱创建成功')
    } catch (error: any) {
      console.error('Create temp email error:', error)
      return this.errorResponse(error.message || '创建临时邮箱失败', error.statusCode || 500)
    }
  }

  private async handleGetTempEmails(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const tempEmails = await this.emailService.getTempEmails(user.userId)
      return this.successResponse(tempEmails)
    } catch (error: any) {
      console.error('Get temp emails error:', error)
      return this.errorResponse(error.message || '获取临时邮箱列表失败', error.statusCode || 500)
    }
  }

  private async handleDeleteTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const emailId = parseInt(url.pathname.split('/').pop() || '0')

      if (!emailId) {
        return this.errorResponse('无效的邮箱ID', 400)
      }

      await this.emailService.deleteTempEmail(user.userId, emailId)
      return this.successResponse(null, '临时邮箱删除成功')
    } catch (error: any) {
      console.error('Delete temp email error:', error)
      return this.errorResponse(error.message || '删除临时邮箱失败', error.statusCode || 500)
    }
  }

  private async handleGetEmailsForTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const tempEmailId = parseInt(pathParts[pathParts.length - 2] || '0')

      if (!tempEmailId) {
        return this.errorResponse('无效的临时邮箱ID', 400)
      }

      // 解析分页参数
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '20')
      const offset = (page - 1) * limit

      const pagination: PaginationParams = { page, limit, offset }
      const emails = await this.emailService.getEmailsForTempEmail(user.userId, tempEmailId, pagination)
      
      return this.successResponse(emails)
    } catch (error: any) {
      console.error('Get emails for temp email error:', error)
      return this.errorResponse(error.message || '获取邮件列表失败', error.statusCode || 500)
    }
  }

  private async handleDeleteEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const emailId = parseInt(url.pathname.split('/').pop() || '0')

      if (!emailId) {
        return this.errorResponse('无效的邮件ID', 400)
      }

      await this.emailService.deleteEmail(user.userId, emailId)
      return this.successResponse(null, '邮件删除成功')
    } catch (error: any) {
      console.error('Delete email error:', error)
      return this.errorResponse(error.message || '删除邮件失败', error.statusCode || 500)
    }
  }

  private async handleRedeemCode(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const data: RedeemRequest = await request.json()

      // 验证Turnstile
      const clientIP = request.headers.get('CF-Connecting-IP') || 
                      request.headers.get('X-Forwarded-For')
      
      const isTurnstileValid = await this.turnstileService.verifyToken(
        data.turnstileToken, 
        clientIP || undefined
      )

      if (!isTurnstileValid) {
        return this.errorResponse('人机验证失败', 400)
      }

      const result = await this.emailService.redeemCode(user.userId, data)
      return this.successResponse(result, '兑换码使用成功')
    } catch (error: any) {
      console.error('Redeem code error:', error)
      return this.errorResponse(error.message || '兑换码使用失败', error.statusCode || 500)
    }
  }

  private async handleGetQuotaInfo(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const quotaInfo = await this.emailService.getQuotaInfo(user.userId)
      return this.successResponse(quotaInfo)
    } catch (error: any) {
      console.error('Get quota info error:', error)
      return this.errorResponse(error.message || '获取配额信息失败', error.statusCode || 500)
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
