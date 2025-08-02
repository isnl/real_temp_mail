import { apiClient } from './request'
import type { 
  TempEmail, 
  Email, 
  Domain, 
  CreateEmailRequest,
  RedeemRequest,
  ApiResponse,
  PaginatedResponse,
  PaginationParams
} from '@/types'

export const emailApi = {
  // 获取用户的临时邮箱列表
  async getTempEmails(): Promise<ApiResponse<TempEmail[]>> {
    return apiClient.get<TempEmail[]>('/email/temp-emails')
  },

  // 创建临时邮箱
  async createTempEmail(data: CreateEmailRequest): Promise<ApiResponse<TempEmail>> {
    return apiClient.post<TempEmail>('/email/create', data)
  },

  // 删除临时邮箱
  async deleteTempEmail(emailId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/email/temp-emails/${emailId}`)
  },

  // 获取指定临时邮箱的邮件列表
  async getEmailsForTempEmail(
    tempEmailId: number, 
    params?: PaginationParams
  ): Promise<ApiResponse<PaginatedResponse<Email>>> {
    return apiClient.get<PaginatedResponse<Email>>(
      `/email/temp-emails/${tempEmailId}/emails`, 
      params
    )
  },

  // 获取单个邮件详情
  async getEmailDetail(emailId: number): Promise<ApiResponse<Email>> {
    return apiClient.get<Email>(`/email/emails/${emailId}`)
  },

  // 删除邮件
  async deleteEmail(emailId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/email/emails/${emailId}`)
  },

  // 获取可用域名列表
  async getDomains(): Promise<ApiResponse<Domain[]>> {
    return apiClient.get<Domain[]>('/email/domains')
  },

  // 兑换配额码
  async redeemCode(data: RedeemRequest): Promise<ApiResponse<{ quota: number }>> {
    return apiClient.post<{ quota: number }>('/email/redeem', data)
  },

  // 获取用户配额信息
  async getQuotaInfo(): Promise<ApiResponse<{ quota: number; used: number }>> {
    return apiClient.get<{ quota: number; used: number }>('/email/quota')
  },

  // 标记邮件为已读
  async markEmailAsRead(emailId: number): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/email/emails/${emailId}/read`)
  },

  // 批量删除邮件
  async deleteEmails(emailIds: number[]): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/email/emails/batch-delete', { emailIds })
  },

  // 搜索邮件
  async searchEmails(params: {
    tempEmailId?: number
    keyword?: string
    sender?: string
    dateFrom?: string
    dateTo?: string
  } & PaginationParams): Promise<ApiResponse<PaginatedResponse<Email>>> {
    return apiClient.get<PaginatedResponse<Email>>('/email/search', params)
  }
}
