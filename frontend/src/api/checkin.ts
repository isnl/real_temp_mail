import { apiClient } from './request'
import type { ApiResponse } from '@/types'

// 广告观看相关类型
export interface CheckinRequest {
  // 广告观看不需要额外参数
}

export interface CheckinResponse {
  success: boolean
  quota_reward: number
  total_quota: number
  message: string
}

export interface CheckinStatus {
  hasCheckedIn: boolean
  checkinRecord?: {
    id: number
    user_id: number
    checkin_date: string
    quota_reward: number
    created_at: string
  }
  nextCheckinTime?: string
}

export interface CheckinHistory {
  id: number
  user_id: number
  checkin_date: string
  quota_reward: number
  created_at: string
}

export interface CheckinStats {
  totalCheckins: number
  currentStreak: number
  longestStreak: number
  thisMonthCheckins: number
}

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

export const checkinApi = {
  // 用户观看广告
  async checkin(data: CheckinRequest): Promise<ApiResponse<CheckinResponse>> {
    return apiClient.post<CheckinResponse>('/api/checkin/checkin', data)
  },

  // 获取观看状态
  async getCheckinStatus(): Promise<ApiResponse<CheckinStatus>> {
    return apiClient.get<CheckinStatus>('/api/checkin/status')
  },

  // 获取观看历史
  async getCheckinHistory(limit: number = 30): Promise<ApiResponse<CheckinHistory[]>> {
    return apiClient.get<CheckinHistory[]>(`/api/checkin/history?limit=${limit}`)
  },

  // 获取观看统计
  async getCheckinStats(): Promise<ApiResponse<CheckinStats>> {
    return apiClient.get<CheckinStats>('/api/checkin/stats')
  },

  // 获取配额记录
  async getQuotaLogs(page: number = 1, limit: number = 20): Promise<ApiResponse<QuotaLogsResponse>> {
    return apiClient.get<QuotaLogsResponse>(`/api/quota/logs?page=${page}&limit=${limit}`)
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
    'checkin': '观看广告',
    'ad_reward': '观看广告',
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
    'checkin': 'gift',
    'ad_reward': 'gift',
    'redeem_code': 'gift',
    'admin_adjust': 'user-cog',
    'create_email': 'envelope'
  }
  return iconMap[source] || 'circle'
}
