import type {
  Env,
  ApiResponse,
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AdminAnnouncementListParams
} from '@/types'

import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '@/types'

import { AnnouncementService } from '@/modules/announcement/announcement.service'
import { createAuthMiddleware } from '@/middleware/auth.middleware'

export class AnnouncementHandler {
  private env: Env
  private announcementService: AnnouncementService
  private authMiddleware: ReturnType<typeof createAuthMiddleware>

  constructor(env: Env) {
    this.env = env
    this.announcementService = new AnnouncementService(env)
    this.authMiddleware = createAuthMiddleware(env)
  }

  private createResponse<T>(data: T, message?: string): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    }
    return new Response(JSON.stringify(response), {
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

  /**
   * 验证管理员权限
   */
  private async validateAdminAuth(request: Request): Promise<void> {
    try {
      const { user } = await this.authMiddleware.authenticate(request)
      if (!user || user.role !== 'admin') {
        throw new AuthorizationError('需要管理员权限')
      }
    } catch (error) {
      if (error instanceof Response) {
        throw new AuthenticationError('认证失败')
      }
      throw error
    }
  }

  /**
   * 获取公告列表（管理员）
   */
  async getAnnouncements(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const params: AdminAnnouncementListParams = {
        page: parseInt(url.searchParams.get('page') || '1'),
        limit: parseInt(url.searchParams.get('limit') || '20'),
        search: url.searchParams.get('search') || undefined,
        status: url.searchParams.get('status') as 'active' | 'inactive' || undefined
      }

      const announcements = await this.announcementService.getAnnouncements(params)
      return this.createResponse(announcements)
    } catch (error) {
      console.error('获取公告列表失败:', error)
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 获取活跃公告列表（用户端）
   */
  async getActiveAnnouncements(request: Request): Promise<Response> {
    try {
      const announcements = await this.announcementService.getActiveAnnouncements()
      return this.createResponse(announcements)
    } catch (error) {
      console.error('获取活跃公告列表失败:', error)
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 根据ID获取公告
   */
  async getAnnouncementById(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const idStr = pathParts[pathParts.length - 1]

      if (!idStr) {
        throw new ValidationError('缺少公告ID')
      }

      const id = parseInt(idStr)
      if (isNaN(id)) {
        throw new ValidationError('无效的公告ID')
      }

      const announcement = await this.announcementService.getAnnouncementById(id)
      if (!announcement) {
        throw new NotFoundError('公告不存在')
      }

      return this.createResponse(announcement)
    } catch (error) {
      console.error('获取公告详情失败:', error)
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 创建公告
   */
  async createAnnouncement(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const requestData = await request.json() as CreateAnnouncementData

      const announcement = await this.announcementService.createAnnouncement(requestData)
      return this.createResponse(announcement, '公告创建成功')
    } catch (error) {
      console.error('创建公告失败:', error)
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const idStr = pathParts[pathParts.length - 1]

      if (!idStr) {
        throw new ValidationError('缺少公告ID')
      }

      const id = parseInt(idStr)
      if (isNaN(id)) {
        throw new ValidationError('无效的公告ID')
      }

      const requestData = await request.json() as UpdateAnnouncementData

      await this.announcementService.updateAnnouncement(id, requestData)
      return this.createResponse(null, '公告更新成功')
    } catch (error) {
      console.error('更新公告失败:', error)
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const idStr = pathParts[pathParts.length - 1]

      if (!idStr) {
        throw new ValidationError('缺少公告ID')
      }

      const id = parseInt(idStr)
      if (isNaN(id)) {
        throw new ValidationError('无效的公告ID')
      }

      await this.announcementService.deleteAnnouncement(id)
      return this.createResponse(null, '公告删除成功')
    } catch (error) {
      console.error('删除公告失败:', error)
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * 切换公告状态
   */
  async toggleAnnouncementStatus(request: Request): Promise<Response> {
    try {
      await this.validateAdminAuth(request)

      const url = new URL(request.url)
      const pathParts = url.pathname.split('/')
      const idStr = pathParts[pathParts.length - 2] // /api/announcements/admin/{id}/toggle

      if (!idStr) {
        throw new ValidationError('缺少公告ID')
      }

      const id = parseInt(idStr)
      if (isNaN(id)) {
        throw new ValidationError('无效的公告ID')
      }

      await this.announcementService.toggleAnnouncementStatus(id)
      return this.createResponse(null, '公告状态切换成功')
    } catch (error) {
      console.error('切换公告状态失败:', error)
      if (error instanceof NotFoundError) {
        return this.createErrorResponse(error, 404)
      }
      if (error instanceof ValidationError) {
        return this.createErrorResponse(error, 400)
      }
      if (error instanceof AuthorizationError) {
        return this.createErrorResponse(error, 403)
      }
      if (error instanceof AuthenticationError) {
        return this.createErrorResponse(error, 401)
      }
      return this.createErrorResponse(error as Error)
    }
  }
}
