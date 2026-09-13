import { apiClient } from './request'
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPair,
  User,
  ApiResponse,
  PublicSystemSettings,
} from '@/types'

export const authApi = {
  // 用户登录
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.postPublic<AuthResponse>('/api/auth/login', data)
  },

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.postPublic<AuthResponse>('/api/auth/register', data)
  },

  async getPublicSettings(): Promise<ApiResponse<PublicSystemSettings>> {
    return apiClient.getPublic<PublicSystemSettings>('/api/public/settings')
  },

  // 刷新Token
  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenPair>> {
    return apiClient.postPublic<TokenPair>('/api/auth/refresh', { refreshToken })
  },

  // 用户登出
  async logout(refreshToken: string): Promise<ApiResponse<void>> {
    return apiClient.postPublic<void>('/api/auth/logout', { refreshToken })
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
  }
}
