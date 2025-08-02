import { apiClient } from './request'
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Email,
  RedeemCode,
  OperationLog
} from '@/types'

// 重新导出需要的类型
export type { Domain, PaginatedResponse } from '@/types'

// 管理员专用类型
export interface AdminDashboardStats {
  users: {
    total: number
    active: number
    inactive: number
    admins: number
  }
  tempEmails: {
    total: number
    active: number
    inactive: number
  }
  emails: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
  }
  domains: {
    total: number
    active: number
    inactive: number
  }
  redeemCodes: {
    total: number
    used: number
    unused: number
    expired: number
  }
  quotaDistribution: {
    totalQuota: number
    usedQuota: number
    averageQuotaPerUser: number
  }
}

export interface AdminUserDetails extends User {
  tempEmailCount: number
  emailCount: number
  lastLoginAt?: string
  registrationIp?: string
}

export interface AdminEmailDetails extends Email {
  tempEmailAddress: string
  userEmail: string
  domainName: string
}

export interface AdminLogDetails extends OperationLog {
  userEmail?: string
}

export interface AdminRedeemCodeDetails extends RedeemCode {
  usedByEmail?: string
}

export interface AdminUserListParams {
  page?: number
  limit?: number
  search?: string
  role?: 'user' | 'admin'
  status?: 'active' | 'inactive'
}

export interface AdminUserUpdateData {
  quota?: number
  is_active?: boolean
  role?: 'user' | 'admin'
}

export interface AdminDomainCreateData {
  domain: string
  status?: number
}

export interface AdminEmailListParams {
  page?: number
  limit?: number
  search?: string
  sender?: string
  tempEmailId?: number
  startDate?: string
  endDate?: string
}

export interface AdminLogListParams {
  page?: number
  limit?: number
  search?: string
  action?: string
  userId?: number
  startDate?: string
  endDate?: string
}

export interface AdminRedeemCodeCreateData {
  quota: number
  validUntil: string
}

export interface BatchRedeemCodeCreate {
  quota: number
  validUntil: string
  count: number
  prefix?: string
}

// ==================== 仪表板统计 ====================

export const getDashboardStats = (): Promise<ApiResponse<AdminDashboardStats>> => {
  return apiClient.get('/api/admin/dashboard/stats')
}

// ==================== 用户管理 ====================

export const getUsers = (params: AdminUserListParams): Promise<ApiResponse<PaginatedResponse<AdminUserDetails>>> => {
  return apiClient.get('/api/admin/users', params)
}

export const getUserById = (userId: number): Promise<ApiResponse<AdminUserDetails>> => {
  return apiClient.get(`/api/admin/users/${userId}`)
}

export const updateUser = (userId: number, data: AdminUserUpdateData): Promise<ApiResponse<null>> => {
  return apiClient.put(`/api/admin/users/${userId}`, data)
}

export const deleteUser = (userId: number): Promise<ApiResponse<null>> => {
  return apiClient.delete(`/api/admin/users/${userId}`)
}

// ==================== 域名管理 ====================

export const getDomains = (): Promise<ApiResponse<Domain[]>> => {
  return apiClient.get('/api/admin/domains')
}

export const createDomain = (data: AdminDomainCreateData): Promise<ApiResponse<Domain>> => {
  return apiClient.post('/api/admin/domains', data)
}

export const updateDomain = (domainId: number, status: number): Promise<ApiResponse<null>> => {
  return apiClient.put(`/api/admin/domains/${domainId}`, { status })
}

export const deleteDomain = (domainId: number): Promise<ApiResponse<null>> => {
  return apiClient.delete(`/api/admin/domains/${domainId}`)
}

// ==================== 邮件审查 ====================

export const getEmails = (params: AdminEmailListParams): Promise<ApiResponse<PaginatedResponse<AdminEmailDetails>>> => {
  return apiClient.get('/api/admin/emails', params)
}

export const deleteEmail = (emailId: number): Promise<ApiResponse<null>> => {
  return apiClient.delete(`/api/admin/emails/${emailId}`)
}

// ==================== 日志审计 ====================

export const getLogs = (params: AdminLogListParams): Promise<ApiResponse<PaginatedResponse<AdminLogDetails>>> => {
  return apiClient.get('/api/admin/logs', params)
}

export const getLogActions = (): Promise<ApiResponse<string[]>> => {
  return apiClient.get('/api/admin/logs/actions')
}

// ==================== 兑换码管理 ====================

export const getRedeemCodes = (page: number = 1, limit: number = 20): Promise<ApiResponse<PaginatedResponse<AdminRedeemCodeDetails>>> => {
  return apiClient.get('/api/admin/redeem-codes', { page, limit })
}

export const createRedeemCode = (data: AdminRedeemCodeCreateData): Promise<ApiResponse<RedeemCode>> => {
  return apiClient.post('/api/admin/redeem-codes', data)
}

export const createBatchRedeemCodes = (data: BatchRedeemCodeCreate): Promise<ApiResponse<RedeemCode[]>> => {
  return apiClient.post('/api/admin/redeem-codes/batch', data)
}

export const deleteRedeemCode = (code: string): Promise<ApiResponse<null>> => {
  return apiClient.delete(`/api/admin/redeem-codes/${code}`)
}

// ==================== 工具函数 ====================

/**
 * 格式化用户状态
 */
export const formatUserStatus = (isActive: boolean): string => {
  return isActive ? '正常' : '禁用'
}

/**
 * 格式化用户角色
 */
export const formatUserRole = (role: string): string => {
  return role === 'admin' ? '管理员' : '普通用户'
}

/**
 * 格式化域名状态
 */
export const formatDomainStatus = (status: number): string => {
  return status === 1 ? '启用' : '禁用'
}

/**
 * 格式化兑换码状态
 */
export const formatRedeemCodeStatus = (code: AdminRedeemCodeDetails): string => {
  if (code.used) {
    return '已使用'
  }
  
  const now = new Date()
  const validUntil = new Date(code.valid_until)
  
  if (validUntil < now) {
    return '已过期'
  }
  
  return '未使用'
}

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化数字
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString()
}
