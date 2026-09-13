import { apiClient } from './request'
import type { ApiResponse } from '@/types'

// 配额记录相关类型
export interface QuotaLog {
  id: number
  user_id: number
  type: 'earn' | 'consume'
  amount: number
  source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email'
  description: string | null
  related_id: number | null
  created_at: string
  expires_at: string | null // 配额过期时间，NULL表示永不过期
  quota_type: 'permanent' | 'daily' | 'custom' // 配额类型
}

export interface QuotaLogsResponse {
  logs: QuotaLog[]
  total: number
}

export interface QuotaInfo {
  remaining: number // 剩余配额
  used: number // 已使用配额
  total: number // 总配额
  expired?: number // 已过期配额
  expiring?: number // 即将过期的配额（24小时内）
}

export const quotaApi = {
  // 获取配额记录
  async getQuotaLogs(page: number = 1, limit: number = 20): Promise<ApiResponse<QuotaLogsResponse>> {
    return apiClient.get<QuotaLogsResponse>('/api/quota/logs', { page, limit })
  },

  // 获取配额信息
  async getQuotaInfo(): Promise<ApiResponse<QuotaInfo>> {
    return apiClient.get<QuotaInfo>('/api/quota/info')
  }
}

// 工具函数
export const formatQuotaSource = (source: string): string => {
  const sourceMap: Record<string, string> = {
    'register': '注册赠送',
    'checkin': '历史签到奖励',
    'redeem_code': '兑换码',
    'admin_adjust': '管理员调整',
    'create_email': '创建邮箱'
  }
  return sourceMap[source] || source
}

export const formatQuotaType = (type: string): string => {
  return type === 'earn' ? '获得' : '消费'
}

export const getQuotaTypeColor = (type: string): string => {
  return type === 'earn' ? 'success' : 'warning'
}

export const getQuotaSourceIcon = (source: string): string => {
  const iconMap: Record<string, string> = {
    'register': 'user-plus',
    'checkin': 'calendar-check',
    'redeem_code': 'gift',
    'admin_adjust': 'user-cog',
    'create_email': 'envelope'
  }
  return iconMap[source] || 'circle'
}
