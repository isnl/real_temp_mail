import { apiClient } from './request'
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  TokenPair,
  User,
  ApiResponse 
} from '@/types'

export const authApi = {
  // 用户登录
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/auth/login', data)
  },

  // 用户注册
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/auth/register', data)
  },

  // 刷新Token
  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenPair>> {
    return apiClient.post<TokenPair>('/auth/refresh', { refreshToken })
  },

  // 用户登出
  async logout(refreshToken: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/logout', { refreshToken })
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>('/auth/me')
  },

  // 修改密码
  async changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/change-password', data)
  },

  // 验证邮箱
  async verifyEmail(token: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/verify-email', { token })
  },

  // 发送密码重置邮件
  async sendPasswordResetEmail(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/forgot-password', { email })
  },

  // 重置密码
  async resetPassword(data: {
    token: string
    newPassword: string
    confirmPassword: string
  }): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/auth/reset-password', data)
  }
}
