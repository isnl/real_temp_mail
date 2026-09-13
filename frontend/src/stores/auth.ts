import { defineStore } from 'pinia'
import type { User, LoginRequest, RegisterRequest, TokenPair } from '@/types'
import { authApi } from '@/api/auth'
import router from '@/router'

let activeRefresh: Promise<ReturnType<typeof authApi.refreshToken> extends Promise<infer Result> ? Result : never> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: '',
    refreshToken: '',
    isAuthenticated: false,
    isLoading: false
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'admin',
    userEmail: (state) => state.user?.email || '',
    userQuota: (state) => state.user?.quota || 0,
    isLoggedIn: (state) => state.isAuthenticated
      && Boolean(state.accessToken)
      && Boolean(state.refreshToken)
      && Boolean(state.user)
  },

  actions: {
    async login(loginData: LoginRequest) {
      this.isLoading = true
      try {
        const response = await authApi.login(loginData)
        if (!response.data?.user || !response.data.tokens) {
          throw new Error(response.error || '登录响应缺少用户信息')
        }
        this.setAuthData(response.data.user, response.data.tokens)
        return response
      } finally {
        this.isLoading = false
      }
    },

    async register(registerData: RegisterRequest) {
      this.isLoading = true
      try {
        const response = await authApi.register(registerData)
        if (!response.data?.user || !response.data.tokens) {
          throw new Error(response.error || '注册响应缺少用户信息')
        }
        this.setAuthData(response.data.user, response.data.tokens)
        return response
      } finally {
        this.isLoading = false
      }
    },

    async refreshTokens() {
      if (!this.refreshToken) {
        this.clearAuthDataAndRedirect()
        throw new Error('No refresh token available')
      }

      if (activeRefresh) return await activeRefresh

      const refreshToken = this.refreshToken
      activeRefresh = authApi.refreshToken(refreshToken)
      try {
        const response = await activeRefresh
        if (this.refreshToken !== refreshToken) {
          throw new Error('登录状态已发生变化')
        }
        if (!response.data?.accessToken || !response.data.refreshToken) {
          throw new Error(response.error || '令牌刷新响应无效')
        }
        this.setTokens(response.data)
        return response
      } catch (error) {
        console.error('Token refresh failed:', error)
        // A logout or a new login may finish while the old rotation request is
        // still in flight. Never let that stale request erase the newer state.
        if (this.refreshToken === refreshToken) this.clearAuthDataAndRedirect()
        throw error
      } finally {
        activeRefresh = null
      }
    },

    async logout() {
      const currentRefreshToken = this.refreshToken

      // 立即清除本地状态，防止死循环
      this.clearAuthData()

      // 尝试通知服务器撤销token
      if (currentRefreshToken) {
        try {
          await authApi.logout(currentRefreshToken)
        } catch (error) {
          console.error('Logout API error (ignored):', error)
          // 忽略服务器错误，因为本地状态已经清除
        }
      }
    },

    setAuthData(user: User, tokens: TokenPair) {
      this.user = user
      this.setTokens(tokens)
      this.isAuthenticated = true
    },

    setTokens(tokens: TokenPair) {
      this.accessToken = tokens.accessToken || ''
      this.refreshToken = tokens.refreshToken || ''
    },

    clearAuthData() {
      this.user = null
      this.accessToken = ''
      this.refreshToken = ''
      this.isAuthenticated = false
    },

    // 清除认证数据并跳转到登录页面（用于token刷新失败时）
    clearAuthDataAndRedirect() {
      this.clearAuthData()
      // 跳转到登录页面
      router.push('/login')
    },

    updateUserQuota(quota: number) {
      if (this.user) {
        this.user.quota = Math.max(0, Number.isFinite(quota) ? quota : 0)
      }
    },

    async fetchCurrentUser() {
      try {
        const response = await authApi.getCurrentUser()
        if (response.data) {
          this.user = response.data
          this.isAuthenticated = true
        }
        return response
      } catch (error) {
        throw error
      }
    },

    // 检查token是否即将过期并自动刷新
    async checkAndRefreshToken() {
      if (!this.accessToken || !this.refreshToken) {
        return false
      }

      try {
        // 这里可以添加token过期检查逻辑
        // 如果token即将过期，自动刷新
        const encodedPayload = this.accessToken.split('.')[1]
        if (!encodedPayload) throw new Error('令牌格式无效')
        const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
        const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
        const payload = JSON.parse(atob(paddedPayload))
        const exp = payload.exp * 1000
        const now = Date.now()
        
        // 如果token在5分钟内过期，则刷新
        if (exp - now < 5 * 60 * 1000) {
          await this.refreshTokens()
          return true
        }
        return true
      } catch (error) {
        console.error('Token check failed:', error)
        this.clearAuthDataAndRedirect()
        return false
      }
    }
  },

  persist: {
    key: 'auth-store',
    storage: localStorage,
    pick: ['accessToken', 'refreshToken', 'user', 'isAuthenticated']
  }
})
