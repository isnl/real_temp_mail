import type { ApiResponse } from '@/types'
import { useAuthStore } from '@/stores/auth'

// Workers Static Assets 与 API 同源部署时不需要额外前缀。项目中的 endpoint
// 已经统一以 /api 开头，默认值不能再设为 /api，否则会产生 /api/api/...。
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '')
const REQUEST_TIMEOUT = 20_000

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const resolveApiUrl = (endpoint: string): string => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

  if (!API_BASE_URL) return normalizedEndpoint

  // 同时兼容 VITE_API_BASE_URL=https://api.example.com 与 .../api 两种配置。
  if (API_BASE_URL.endsWith('/api') && normalizedEndpoint.startsWith('/api/')) {
    return `${API_BASE_URL}${normalizedEndpoint.slice(4)}`
  }

  return `${API_BASE_URL}${normalizedEndpoint}`
}

const parseResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  if (response.status === 204) {
    return { success: true } as ApiResponse<T>
  }

  const text = await response.text()
  if (!text) return { success: response.ok } as ApiResponse<T>

  try {
    return JSON.parse(text) as ApiResponse<T>
  } catch {
    throw new ApiError('服务器返回了无法解析的数据', response.status)
  }
}

// 请求拦截器
class ApiClient {
  private baseURL: string
  private refreshPromise: Promise<void> | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
    const externalSignal = options.signal
    const abortFromExternalSignal = () => controller.abort()
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })

    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(externalSignal?.aborted ? '请求已取消' : '请求超时，请稍后重试')
      }
      throw new Error(error instanceof Error ? error.message : '网络连接失败，请检查网络后重试')
    } finally {
      window.clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', abortFromExternalSignal)
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    authMode: 'session' | 'none' = 'session',
  ): Promise<ApiResponse<T>> {
    const authStore = useAuthStore()

    const url = this.baseURL === API_BASE_URL
      ? resolveApiUrl(endpoint)
      : `${this.baseURL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`

    // 默认请求头
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string> || {})
    }

    // 添加认证头
    if (authMode === 'session' && authStore.accessToken) {
      headers['Authorization'] = `Bearer ${authStore.accessToken}`
    }

    const response = await this.fetchWithTimeout(url, { ...options, headers })

    // 处理响应
    if (!response.ok) {
      // 先获取错误数据
      const errorData: ApiResponse<unknown> = await parseResponse<unknown>(response)
        .catch(() => ({ success: false }))

      // 如果是401错误且不是刷新token或密码相关的错误，尝试刷新token
      if (authMode === 'session' &&
          response.status === 401 &&
          authStore.refreshToken &&
          !endpoint.includes('refresh') &&
          !endpoint.includes('change-password') &&
          !endpoint.includes('login') &&
          !endpoint.includes('register')) {

        try {
          if (!this.refreshPromise) {
            const refreshRequest = authStore.refreshTokens()
              .then(() => undefined)
              .finally(() => {
                if (this.refreshPromise === refreshRequest) this.refreshPromise = null
              })
            this.refreshPromise = refreshRequest
          }
          await this.refreshPromise
        } catch {
          authStore.clearAuthDataAndRedirect()
          throw new Error('认证失败，请重新登录')
        }

        headers['Authorization'] = `Bearer ${authStore.accessToken}`
        const retryResponse = await this.fetchWithTimeout(url, { ...options, headers })
        if (retryResponse.ok) return await parseResponse<T>(retryResponse)

        const retryErrorData: ApiResponse<unknown> = await parseResponse<unknown>(retryResponse)
          .catch(() => ({ success: false }))
        const retryErrorMessage = retryErrorData.error || retryErrorData.message
          || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
        if (retryResponse.status === 401) authStore.clearAuthDataAndRedirect()
        throw new ApiError(retryErrorMessage, retryResponse.status)
      }

      if (authMode === 'session' &&
          response.status === 401 &&
          !endpoint.includes('login') &&
          !endpoint.includes('register') &&
          !endpoint.includes('refresh')) {
        authStore.clearAuthDataAndRedirect()
      }

      // 对于其他错误，抛出异常
      const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
      throw new ApiError(errorMessage, response.status)
    }

    return await parseResponse<T>(response)
  }

  async get<T>(endpoint: string, params?: object): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
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

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data)
    })
  }

  async getPublic<T>(endpoint: string, params?: object): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value !== undefined && value !== null) searchParams.append(key, String(value))
      })
      url += `?${searchParams.toString()}`
    }
    return this.request<T>(url, { method: 'GET' }, 'none')
  }

  async postPublic<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    }, 'none')
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data)
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE'
    })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data === undefined ? undefined : JSON.stringify(data)
    })
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient(API_BASE_URL)
