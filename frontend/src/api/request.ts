import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 请求拦截器
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const authStore = useAuthStore()
    
    // 构建完整URL
    const url = `${this.baseURL}${endpoint}`
    
    // 默认请求头
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    // 添加认证头
    if (authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }

    // 发送请求
    const response = await fetch(url, {
      ...options,
      headers
    })

    // 处理响应
    if (!response.ok) {
      // 如果是401错误，尝试刷新token
      if (response.status === 401 && authStore.refreshToken) {
        try {
          await authStore.refreshTokens()
          // 重新发送原请求
          headers['Authorization'] = `Bearer ${authStore.accessToken}`
          const retryResponse = await fetch(url, {
            ...options,
            headers
          })
          
          if (retryResponse.ok) {
            return await retryResponse.json()
          }
        } catch (error) {
          // 刷新失败，跳转到登录页
          authStore.logout()
          throw new Error('认证失败，请重新登录')
        }
      }

      // 处理其他错误
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      url += `?${searchParams.toString()}`
    }

    return this.request<T>(url, {
      method: 'GET'
    })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(API_BASE_URL)

// 导出便捷方法
export const { get, post, put, delete: del, patch } = apiClient
