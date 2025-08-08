import { defineStore } from 'pinia'
import type { User, LoginRequest, RegisterRequest, TokenPair } from '@/types'
import { authApi } from '@/api/auth'

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
    isLoggedIn: (state) => state.isAuthenticated && !!state.user
  },

  actions: {
    async login(loginData: LoginRequest) {
      this.isLoading = true
      try {
        const response = await authApi.login(loginData)
        // API 客户端现在在错误时会抛出异常，所以这里只处理成功的情况
        this.setAuthData(response.data!.user, response.data!.tokens)
        return response
      } catch (error) {
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async register(registerData: RegisterRequest) {
      this.isLoading = true
      try {
        const response = await authApi.register(registerData)
        // API 客户端现在在错误时会抛出异常，所以这里只处理成功的情况
        this.setAuthData(response.data!.user, response.data!.tokens)
        return response
      } catch (error) {
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async refreshTokens() {
      if (!this.refreshToken) {
        this.logout()
        throw new Error('No refresh token available')
      }

      try {
        const response = await authApi.refreshToken(this.refreshToken)
        // API 客户端现在在错误时会抛出异常，所以这里只处理成功的情况
        this.setTokens(response.data!)
        return response
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.logout()
        throw error
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
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
    },

    clearAuthData() {
      this.user = null
      this.accessToken = ''
      this.refreshToken = ''
      this.isAuthenticated = false
    },

    updateUserQuota(quota: number) {
      if (this.user) {
        this.user.quota = quota
      }
    },

    async fetchCurrentUser() {
      try {
        const response = await authApi.getCurrentUser()
        if (response.data) {
          this.user = response.data
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
        const payload = JSON.parse(atob(this.accessToken.split('.')[1]))
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
        this.logout()
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
