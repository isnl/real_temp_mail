import type { 
  Env, 
  CreateEmailRequest, 
  PublicInboxRequest,
  RedeemRequest, 
  UpdateTempEmailPublicInboxRequest,
  ApiResponse,
  PaginationParams 
} from '@/types'
import { EmailService } from '@/modules/email/email.service'
import { DatabaseService } from '@/modules/shared/database.service'
import { withAuth, type AuthenticatedRequest } from '@/middleware/auth.middleware'
import { createRateLimitMiddleware, withRateLimit } from '@/middleware/ratelimit.middleware'
import { AppError, ValidationError, type JWTPayload } from '@/types'
import { normalizeApiTimestamps } from '@/utils/datetime'

export class EmailHandler {
  private emailService: EmailService
  private rateLimiter: ReturnType<typeof createRateLimitMiddleware>
  public createTempEmail: (request: Request) => Promise<Response>
  public getTempEmails: (request: Request) => Promise<Response>
  public deleteTempEmail: (request: Request) => Promise<Response>
  public updateTempEmailPublicInbox: (request: Request) => Promise<Response>
  public getEmailsForTempEmail: (request: Request) => Promise<Response>
  public getPublicInbox: (request: Request) => Promise<Response>
  public getPublicEmailDetail: (request: Request) => Promise<Response>
  public getEmailDetail: (request: Request) => Promise<Response>
  public deleteEmail: (request: Request) => Promise<Response>
  public redeemCode: (request: Request) => Promise<Response>
  public getQuotaInfo: (request: Request) => Promise<Response>
  public markEmailRead: (request: Request) => Promise<Response>
  public batchDeleteEmails: (request: Request) => Promise<Response>
  public searchEmails: (request: Request) => Promise<Response>

  constructor(private env: Env) {
    const dbService = new DatabaseService(env.DB)
    this.emailService = new EmailService(env, dbService)
    this.rateLimiter = createRateLimitMiddleware(env)

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

    this.updateTempEmailPublicInbox = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleUpdateTempEmailPublicInbox(request, user)
    })

    this.getEmailsForTempEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetEmailsForTempEmail(request, user)
    })

    this.getPublicInbox = (request: Request) => {
      return this.handleGetPublicInbox(request)
    }

    this.getPublicEmailDetail = (request: Request) => {
      return this.handleGetPublicEmailDetail(request)
    }

    this.getEmailDetail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetEmailDetail(request, user)
    })

    this.deleteEmail = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleDeleteEmail(request, user)
    })

    this.redeemCode = withAuth(this.env)(withRateLimit(this.env, '/api/email/redeem')((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleRedeemCode(request, user)
    }))

    this.getQuotaInfo = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleGetQuotaInfo(request, user)
    })

    this.markEmailRead = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleMarkEmailRead(request, user)
    })

    this.batchDeleteEmails = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleBatchDeleteEmails(request, user)
    })

    this.searchEmails = withAuth(this.env)((request: AuthenticatedRequest, user: JWTPayload) => {
      return this.handleSearchEmails(request, user)
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
      return this.exceptionResponse(error, '获取域名列表失败')
    }
  }

  private async handleCreateTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const data = await this.parseJson<CreateEmailRequest>(request)

      const tempEmail = await this.emailService.createTempEmail(user.userId, data, request)

      const quota = await this.emailService.getQuotaInfo(user.userId)

      return this.successResponse({
        tempEmail,
        userQuota: quota.quota
      }, '临时邮箱创建成功')
    } catch (error: any) {
      console.error('Create temp email error:', error)
      return this.exceptionResponse(error, '创建临时邮箱失败')
    }
  }

  private async handleGetTempEmails(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const tempEmails = await this.emailService.getTempEmails(user.userId)
      return this.successResponse(tempEmails)
    } catch (error: any) {
      console.error('Get temp emails error:', error)
      return this.exceptionResponse(error, '获取临时邮箱列表失败')
    }
  }

  private async handleDeleteTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const emailId = this.parseId(url.pathname.split('/').pop())

      if (!emailId) {
        return this.errorResponse('无效的邮箱ID', 400)
      }

      await this.emailService.deleteTempEmail(user.userId, emailId)
      return this.successResponse(null, '临时邮箱删除成功')
    } catch (error: any) {
      console.error('Delete temp email error:', error)
      return this.exceptionResponse(error, '删除临时邮箱失败')
    }
  }

  private async handleUpdateTempEmailPublicInbox(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const emailId = this.parseId(pathParts[pathParts.length - 2])

      if (!emailId) {
        return this.errorResponse('无效的邮箱ID', 400)
      }

      const data = await this.parseJson<UpdateTempEmailPublicInboxRequest>(request)
      if (typeof data.publicInboxEnabled !== 'boolean') {
        return this.errorResponse('公开收件箱状态无效', 400)
      }

      const tempEmail = await this.emailService.updateTempEmailPublicInbox(
        user.userId,
        emailId,
        data.publicInboxEnabled
      )

      return this.successResponse(tempEmail, data.publicInboxEnabled ? '公开收件箱已开启' : '公开收件箱已关闭')
    } catch (error: any) {
      console.error('Update public inbox error:', error)
      return this.exceptionResponse(error, '更新公开收件箱失败')
    }
  }

  private async handleGetEmailsForTempEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const tempEmailId = this.parseId(pathParts[pathParts.length - 2])

      if (!tempEmailId) {
        return this.errorResponse('无效的临时邮箱ID', 400)
      }

      const pagination = this.parsePagination(url.searchParams, 100)
      const emails = await this.emailService.getEmailsForTempEmail(user.userId, tempEmailId, pagination)

      return this.successResponse(emails)
    } catch (error: any) {
      console.error('Get emails for temp email error:', error)
      return this.exceptionResponse(error, '获取邮件列表失败')
    }
  }

  private async handleGetPublicInbox(request: Request): Promise<Response> {
    try {
      const requestForRateLimit = request.clone() as Request
      // Every request consumes rate-limit capacity. A previously issued access
      // token skips only Turnstile; it never bypasses abuse controls.
      await this.rateLimiter.checkRateLimit(
        requestForRateLimit,
        '/api/email/public-inbox',
        undefined,
        { skipTurnstile: true }
      )

      const data = await this.parseJson<PublicInboxRequest>(request)
      if (typeof data.email !== 'string' || data.email.length > 254) {
        return this.errorResponse('请输入有效的邮箱地址', 400)
      }
      const access = await this.emailService.validatePublicInboxAccessToken(
        data.publicAccessToken,
        data.email
      )

      if (!access) {
        await this.rateLimiter.checkTurnstile(requestForRateLimit, '/api/email/public-inbox')
      }

      const url = new URL(request.url)
      const page = this.parsePositiveInteger(data.page ?? url.searchParams.get('page'), 1, 100000)
      const limit = this.parsePositiveInteger(data.limit ?? url.searchParams.get('limit'), 20, 50)

      const publicInbox = await this.emailService.getPublicInbox(data.email, {
        page,
        limit,
        offset: (page - 1) * limit
      }, access ?? undefined)

      return this.successResponse(publicInbox)
    } catch (error: any) {
      console.error('Get public inbox error:', error)
      return this.exceptionResponse(error, '获取公开收件箱失败')
    }
  }

  private async handleGetPublicEmailDetail(request: Request): Promise<Response> {
    try {
      const requestForRateLimit = request.clone() as Request
      await this.rateLimiter.checkRateLimit(
        requestForRateLimit,
        '/api/email/public-inbox',
        undefined,
        { skipTurnstile: true }
      )

      const body = await this.parseJson<Pick<PublicInboxRequest, 'email' | 'publicAccessToken'>>(request)
      if (typeof body.email !== 'string' || body.email.length > 254) {
        return this.errorResponse('请输入有效的邮箱地址', 400)
      }
      const access = await this.emailService.validatePublicInboxAccessToken(
        body.publicAccessToken,
        body.email
      )
      if (!access) return this.errorResponse('公开收件箱访问凭证无效或已过期', 401)

      const pathParts = new URL(request.url).pathname.split('/')
      const emailId = this.parseId(pathParts[pathParts.length - 1])
      if (!emailId) return this.errorResponse('无效的邮件ID', 400)

      return this.successResponse(await this.emailService.getPublicEmailDetail(body.email, emailId))
    } catch (error: any) {
      console.error('Get public email detail error:', error)
      return this.exceptionResponse(error, '获取公开邮件详情失败')
    }
  }

  private async handleGetEmailDetail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const emailId = this.parseId(url.pathname.split('/').pop())

      if (!emailId) {
        return this.errorResponse('无效的邮件ID', 400)
      }

      const email = await this.emailService.getEmailDetail(user.userId, emailId)
      return this.successResponse(email)
    } catch (error: any) {
      console.error('Get email detail error:', error)
      return this.exceptionResponse(error, '获取邮件详情失败')
    }
  }

  private async handleDeleteEmail(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const url = new URL(request.url)
      const emailId = this.parseId(url.pathname.split('/').pop())

      if (!emailId) {
        return this.errorResponse('无效的邮件ID', 400)
      }

      await this.emailService.deleteEmail(user.userId, emailId)
      return this.successResponse(null, '邮件删除成功')
    } catch (error: any) {
      console.error('Delete email error:', error)
      return this.exceptionResponse(error, '删除邮件失败')
    }
  }

  private async handleMarkEmailRead(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const pathParts = new URL(request.url).pathname.split('/')
      const emailId = this.parseId(pathParts[pathParts.length - 2])
      if (!emailId) return this.errorResponse('无效的邮件ID', 400)

      await this.emailService.markEmailRead(user.userId, emailId)
      return this.successResponse(null, '邮件已标记为已读')
    } catch (error: any) {
      console.error('Mark email read error:', error)
      return this.exceptionResponse(error, '标记邮件失败')
    }
  }

  private async handleBatchDeleteEmails(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const body = await this.parseJson<{ emailIds?: unknown }>(request)
      if (!Array.isArray(body.emailIds) || body.emailIds.length < 1 || body.emailIds.length > 50) {
        return this.errorResponse('邮件ID列表须包含 1-50 项', 400)
      }

      const emailIds = [...new Set(body.emailIds)]
      if (!emailIds.every(id => Number.isSafeInteger(id) && Number(id) > 0)) {
        return this.errorResponse('邮件ID列表格式无效', 400)
      }

      const deleted = await this.emailService.batchDeleteEmails(user.userId, emailIds as number[])
      return this.successResponse({ deleted }, `已删除 ${deleted} 封邮件`)
    } catch (error: any) {
      console.error('Batch delete emails error:', error)
      return this.exceptionResponse(error, '批量删除邮件失败')
    }
  }

  private async handleSearchEmails(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const searchParams = new URL(request.url).searchParams
      const pagination = this.parsePagination(searchParams, 100)
      const tempEmailValue = searchParams.get('tempEmailId')
      const tempEmailId = tempEmailValue === null ? undefined : this.parseId(tempEmailValue)
      if (tempEmailValue !== null && !tempEmailId) {
        return this.errorResponse('无效的临时邮箱ID', 400)
      }

      const keyword = this.parseOptionalText(searchParams.get('keyword'), 200, '搜索关键词')
      const sender = this.parseOptionalText(searchParams.get('sender'), 320, '发件人')
      const dateFrom = this.parseOptionalDate(searchParams.get('dateFrom'), '开始日期')
      const dateTo = this.parseOptionalDate(searchParams.get('dateTo'), '结束日期', true)
      if (dateFrom && dateTo && Date.parse(dateFrom) >= Date.parse(dateTo)) {
        return this.errorResponse('开始日期不能晚于结束日期', 400)
      }

      const result = await this.emailService.searchEmails(user.userId, {
        tempEmailId,
        keyword,
        sender,
        dateFrom,
        dateTo,
        ...pagination
      })
      return this.successResponse(result)
    } catch (error: any) {
      console.error('Search emails error:', error)
      return this.exceptionResponse(error, '搜索邮件失败')
    }
  }

  private async handleRedeemCode(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const data = await this.parseJson<RedeemRequest>(request)

      const result = await this.emailService.redeemCode(user.userId, data)
      return this.successResponse(result, '兑换码使用成功')
    } catch (error: any) {
      console.error('Redeem code error:', error)
      return this.exceptionResponse(error, '兑换码使用失败')
    }
  }

  private async handleGetQuotaInfo(request: AuthenticatedRequest, user: JWTPayload): Promise<Response> {
    try {
      const quotaInfo = await this.emailService.getQuotaInfo(user.userId)
      return this.successResponse(quotaInfo)
    } catch (error: any) {
      console.error('Get quota info error:', error)
      return this.exceptionResponse(error, '获取配额信息失败')
    }
  }

  private parseId(value: string | undefined): number {
    if (!value || !/^\d+$/.test(value)) return 0
    const id = Number(value)
    return Number.isSafeInteger(id) && id > 0 ? id : 0
  }

  private async parseJson<T>(request: Request): Promise<T> {
    try {
      const value = JSON.parse(await this.readBoundedBody(request, 8 * 1024))
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

  private parsePagination(searchParams: URLSearchParams, maxLimit: number): PaginationParams {
    const page = this.parsePositiveInteger(searchParams.get('page'), 1, 100000)
    const limit = this.parsePositiveInteger(searchParams.get('limit'), 20, maxLimit)
    return { page, limit, offset: (page - 1) * limit }
  }

  private parsePositiveInteger(value: unknown, fallback: number, maximum: number): number {
    if (value === undefined || value === null || value === '') return fallback
    const text = String(value)
    if (!/^\d+$/.test(text)) throw new ValidationError('分页参数无效')
    const parsed = Number(text)
    if (!Number.isSafeInteger(parsed) || parsed < 1) throw new ValidationError('分页参数无效')
    return Math.min(parsed, maximum)
  }

  private parseOptionalText(value: string | null, maximum: number, label: string): string | undefined {
    const normalized = value?.trim()
    if (!normalized) return undefined
    if (normalized.length > maximum) throw new ValidationError(`${label}长度不能超过 ${maximum}`)
    return normalized
  }

  private parseOptionalDate(
    value: string | null,
    label: string,
    endOfDayExclusive = false
  ): string | undefined {
    const normalized = value?.trim()
    if (!normalized) return undefined
    if (normalized.length > 64) {
      throw new ValidationError(`${label}格式无效`)
    }
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
    const date = dateOnly
      ? new Date(`${normalized}T00:00:00.000Z`)
      : new Date(normalized)
    if (
      Number.isNaN(date.getTime()) ||
      (dateOnly && date.toISOString().slice(0, 10) !== normalized)
    ) {
      throw new ValidationError(`${label}格式无效`)
    }
    if (dateOnly && endOfDayExclusive) date.setUTCDate(date.getUTCDate() + 1)
    return date.toISOString()
  }

  private successResponse<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    }

    return new Response(JSON.stringify(normalizeApiTimestamps(response)), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  private exceptionResponse(error: unknown, fallbackMessage: string): Response {
    if (error instanceof Response) return error
    if (error instanceof AppError) {
      return this.errorResponse(error.message, error.statusCode)
    }
    return this.errorResponse(fallbackMessage, 500)
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
