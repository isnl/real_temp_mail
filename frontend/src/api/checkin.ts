import { apiClient } from './request'
import type { ApiResponse } from '@/types'

// 签到相关类型
export interface CheckinRequest {
  // 签到不需要额外参数
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
}

export interface QuotaLogsResponse {
  logs: QuotaLog[]
  total: number
}

export interface QuotaInfo {
  remaining: number // 剩余配额
  used: number // 已使用配额
  total: number // 总配额
}

export const checkinApi = {
  // 用户签到
  async checkin(data: CheckinRequest): Promise<ApiResponse<CheckinResponse>> {
    return apiClient.post<CheckinResponse>('/api/checkin/checkin', data)
  },

  // 获取签到状态
  async getCheckinStatus(): Promise<ApiResponse<CheckinStatus>> {
    return apiClient.get<CheckinStatus>('/api/checkin/status')
  },

  // 获取签到历史
  async getCheckinHistory(limit: number = 30): Promise<ApiResponse<CheckinHistory[]>> {
    return apiClient.get<CheckinHistory[]>(`/api/checkin/history?limit=${limit}`)
  },

  // 获取签到统计
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
    'checkin': '每日签到',
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
