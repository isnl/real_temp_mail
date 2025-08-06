import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 请求拦截器
class ApiClient {
  private baseURL: string
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
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
      // 先获取错误数据
      const errorData = await response.json().catch(() => ({}))

      // 如果是401错误且不是刷新token或密码相关的错误，尝试刷新token
      if (response.status === 401 &&
          authStore.refreshToken &&
          !endpoint.includes('refresh') &&
          !endpoint.includes('change-password') &&
          !endpoint.includes('login') &&
          !endpoint.includes('register')) {

        try {
          // 防止并发刷新
          if (this.isRefreshing) {
            // 等待正在进行的刷新完成
            if (this.refreshPromise) {
              await this.refreshPromise
            }
          } else {
            // 开始刷新
            this.isRefreshing = true
            this.refreshPromise = authStore.refreshTokens().then(() => {
              this.isRefreshing = false
              this.refreshPromise = null
            }).catch((error) => {
              this.isRefreshing = false
              this.refreshPromise = null
              throw error
            })

            await this.refreshPromise
          }

          // 重新发送原请求
          headers['Authorization'] = `Bearer ${authStore.accessToken}`
          const retryResponse = await fetch(url, {
            ...options,
            headers
          })

          if (retryResponse.ok) {
            return await retryResponse.json()
          } else {
            // 重试后仍然失败，返回错误信息
            const retryErrorData = await retryResponse.json().catch(() => ({}))
            return {
              success: false,
              error: retryErrorData.error || retryErrorData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
            } as ApiResponse<T>
          }
        } catch (error) {
          // 刷新失败，清除认证状态
          authStore.logout()
          return {
            success: false,
            error: '认证失败，请重新登录'
          } as ApiResponse<T>
        }
      }

      // 对于其他错误（包括密码错误），直接返回错误信息而不抛出异常
      return {
        success: false,
        error: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
      } as ApiResponse<T>
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
