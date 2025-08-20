import { apiClient } from './request'
import type { ApiResponse } from '@/types'

// 广告相关接口类型定义
export interface GenerateQRCodeResponse {
  qrCodeUrl: string
  code: string
}

export interface VerifyAdStatusRequest {
  code: string
}

export interface VerifyAdStatusResponse {
  success: boolean
  message: string
  quota?: number
}

export const adsApi = {
  // 生成广告二维码
  async generateQRCode(): Promise<ApiResponse<GenerateQRCodeResponse>> {
    return apiClient.post<GenerateQRCodeResponse>('/api/ads/qrcode', {})
  },

  // 验证广告观看状态
  async verifyAdStatus(data: VerifyAdStatusRequest): Promise<ApiResponse<VerifyAdStatusResponse>> {
    return apiClient.post<VerifyAdStatusResponse>('/api/ads/verify', data)
  }
}
