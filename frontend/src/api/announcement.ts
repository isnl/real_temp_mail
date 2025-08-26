import { apiClient } from './request'
import type { ApiResponse } from '@/types'

// 公告相关类型
export interface Announcement {
  id: number
  title: string
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// 获取活跃公告（用户端）
export const getActiveAnnouncements = (): Promise<ApiResponse<Announcement[]>> => {
  return apiClient.get('/api/announcements/active')
}

// 获取最新的一条活跃公告
export const getLatestAnnouncement = async (): Promise<ApiResponse<Announcement | null>> => {
  try {
    const response = await getActiveAnnouncements()
    if (response.success && response.data && response.data.length > 0) {
      return {
        success: true,
        data: response.data[0] // 返回最新的一条
      }
    }
    return {
      success: true,
      data: null
    }
  } catch (error) {
    return {
      success: false,
      error: '获取公告失败'
    }
  }
}
