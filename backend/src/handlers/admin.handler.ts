import type {
  Env,
  ApiResponse,
  AdminUserListParams,
  AdminUserUpdateData,
  AdminDomainCreateData,
  AdminEmailListParams,
  AdminLogListParams,
  AdminRedeemCodeCreateData
} from '@/types'

import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '@/types'

import type { BatchRedeemCodeCreate } from '@/modules/admin/types'
import { AdminService } from '@/modules/admin/admin.service'
import { createAuthMiddleware } from '@/middleware/auth.middleware'

export class AdminHandler {
  private adminService: AdminService
  private authMiddleware: any

  constructor(private env: Env) {
    this.adminService = new AdminService(env)
    this.authMiddleware = createAuthMiddleware(env)
  }

  private async validateAdminAuth(request: Request): Promise<any> {
    const user = await this.authMiddleware.validateToken(request)
    if (!user || user.role !== 'admin') {
      throw new AuthorizationError('需要管理员权限')
    }
    return user
  }

  private createResponse<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  private createErrorResponse(error: Error, statusCode: number = 500): Response {
    const response: ApiResponse = {
      success: false,
      error: error.message
    }
    return new Response(JSON.stringify(response), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // ==================== 仪表板统计 ====================
  
  async getDashboardStats(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      const stats = await this.adminService.getDashboardStats()
      return this.createResponse(stats)
    } catch (error) {
      console.error('获取仪表板统计失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  // ==================== 用户管理 ====================
  
  async getUsers(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const params: AdminUserListParams = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        search: url.searchParams.get('search') || undefined,
        role: url.searchParams.get('role') as 'user' | 'admin' || undefined,
        status: url.searchParams.get('status') as 'active' | 'inactive' || undefined
      }

      const users = await this.adminService.getUsers(params)
      return this.createResponse(users)
    } catch (error) {
      console.error('获取用户列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async getUserById(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const userId = parseInt(url.pathname.split('/').pop() || '0')
      
      if (!userId) {
        throw new ValidationError('用户ID无效')
      }

      const user = await this.adminService.getUserById(userId)
      if (!user) {
        throw new NotFoundError('用户不存在')
      }

      return this.createResponse(user)
    } catch (error) {
      console.error('获取用户详情失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async updateUser(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const userId = parseInt(url.pathname.split('/').pop() || '0')
      
      if (!userId) {
        throw new ValidationError('用户ID无效')
      }

      const updateData: AdminUserUpdateData = await request.json()
      await this.adminService.updateUser(userId, updateData)

      return this.createResponse(null, '用户更新成功')
    } catch (error) {
      console.error('更新用户失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async deleteUser(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const userId = parseInt(url.pathname.split('/').pop() || '0')
      
      if (!userId) {
        throw new ValidationError('用户ID无效')
      }

      await this.adminService.deleteUser(userId)
      return this.createResponse(null, '用户删除成功')
    } catch (error) {
      console.error('删除用户失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  // ==================== 域名管理 ====================
  
  async getDomains(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      const domains = await this.adminService.getDomains()
      return this.createResponse(domains)
    } catch (error) {
      console.error('获取域名列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async createDomain(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const domainData: AdminDomainCreateData = await request.json()
      
      if (!domainData.domain) {
        throw new ValidationError('域名不能为空')
      }

      const domain = await this.adminService.createDomain(domainData)
      return this.createResponse(domain, '域名创建成功')
    } catch (error) {
      console.error('创建域名失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async updateDomain(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const domainId = parseInt(url.pathname.split('/').pop() || '0')
      
      if (!domainId) {
        throw new ValidationError('域名ID无效')
      }

      const requestBody = await request.json() as { status: number }

      if (requestBody.status === undefined) {
        throw new ValidationError('状态不能为空')
      }

      await this.adminService.updateDomain(domainId, requestBody.status)
      return this.createResponse(null, '域名更新成功')
    } catch (error) {
      console.error('更新域名失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async deleteDomain(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      
      const url = new URL(request.url)
      const domainId = parseInt(url.pathname.split('/').pop() || '0')
      
      if (!domainId) {
        throw new ValidationError('域名ID无效')
      }

      await this.adminService.deleteDomain(domainId)
      return this.createResponse(null, '域名删除成功')
    } catch (error) {
      console.error('删除域名失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  // ==================== 邮件审查 ====================

  async getEmails(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const params: AdminEmailListParams = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        search: url.searchParams.get('search') || undefined,
        sender: url.searchParams.get('sender') || undefined,
        tempEmailId: parseInt(url.searchParams.get('tempEmailId') || '0') || undefined,
        startDate: url.searchParams.get('startDate') || undefined,
        endDate: url.searchParams.get('endDate') || undefined
      }

      const emails = await this.adminService.getEmails(params)
      return this.createResponse(emails)
    } catch (error) {
      console.error('获取邮件列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async deleteEmail(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const emailId = parseInt(url.pathname.split('/').pop() || '0')

      if (!emailId) {
        throw new ValidationError('邮件ID无效')
      }

      await this.adminService.deleteEmail(emailId)
      return this.createResponse(null, '邮件删除成功')
    } catch (error) {
      console.error('删除邮件失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  // ==================== 日志审计 ====================

  async getLogs(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const params: AdminLogListParams = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        search: url.searchParams.get('search') || undefined,
        action: url.searchParams.get('action') || undefined,
        userId: parseInt(url.searchParams.get('userId') || '0') || undefined,
        startDate: url.searchParams.get('startDate') || undefined,
        endDate: url.searchParams.get('endDate') || undefined
      }

      const logs = await this.adminService.getLogs(params)
      return this.createResponse(logs)
    } catch (error) {
      console.error('获取日志列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async getLogActions(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)
      const actions = await this.adminService.getLogActions()
      return this.createResponse(actions)
    } catch (error) {
      console.error('获取日志操作类型失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  // ==================== 兑换码管理 ====================

  async getRedeemCodes(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '20')

      const codes = await this.adminService.getRedeemCodes(page, limit)
      return this.createResponse(codes)
    } catch (error) {
      console.error('获取兑换码列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async createRedeemCode(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const data: AdminRedeemCodeCreateData = await request.json()

      if (!data.quota || data.quota <= 0) {
        throw new ValidationError('配额必须大于0')
      }

      if (!data.validUntil) {
        throw new ValidationError('有效期不能为空')
      }

      const code = await this.adminService.createRedeemCode(data)
      return this.createResponse(code, '兑换码创建成功')
    } catch (error) {
      console.error('创建兑换码失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async createBatchRedeemCodes(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const data: BatchRedeemCodeCreate = await request.json()

      if (!data.quota || data.quota <= 0) {
        throw new ValidationError('配额必须大于0')
      }

      if (!data.validUntil) {
        throw new ValidationError('有效期不能为空')
      }

      if (!data.count || data.count <= 0 || data.count > 100) {
        throw new ValidationError('数量必须在1-100之间')
      }

      const codes = await this.adminService.createBatchRedeemCodes(data)
      return this.createResponse(codes, `成功创建${codes.length}个兑换码`)
    } catch (error) {
      console.error('批量创建兑换码失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  async deleteRedeemCode(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const code = url.pathname.split('/').pop()

      if (!code) {
        throw new ValidationError('兑换码无效')
      }

      await this.adminService.deleteRedeemCode(code)
      return this.createResponse(null, '兑换码删除成功')
    } catch (error) {
      console.error('删除兑换码失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }
}
