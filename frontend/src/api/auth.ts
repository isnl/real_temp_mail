import { apiClient } from './request'
import type {
  LoginRequest,
  AuthResponse,
  TokenPair,
  User,
  ApiResponse
} from '@/types'

export const authApi = {
  // 用户登录
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/login', data)
  },



  // 刷新Token
  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenPair>> {
    return apiClient.post<TokenPair>('/api/auth/refresh', { refreshToken })
  },

  // 用户登出
  async logout(refreshToken: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/logout', { refreshToken })
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/api/auth/me')
  },

  // 修改密码
  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/change-password', data)
  },

  // 验证邮箱
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/verify-email', { token })
  },

  // 发送密码重置邮件
  async sendPasswordResetEmail(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/forgot-password', { email })
  },

  // 重置密码
  async resetPassword(data: {
    token: string
    newPassword: string
    confirmPassword: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/reset-password', data)
  }
}
