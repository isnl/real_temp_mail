import { defineStore } from 'pinia'
import type { TempEmail, Email, Domain, CreateEmailRequest, RedeemRequest } from '@/types'
import { emailApi } from '@/api/email'

export const useEmailStore = defineStore('email', {
  state: () => ({
    tempEmails: [] as TempEmail[],
    currentEmails: [] as Email[],
    domains: [] as Domain[],
    selectedTempEmail: null as TempEmail | null,
    isLoading: false,
    isCreatingEmail: false
  }),

  getters: {
    activeTempEmails: (state) => state.tempEmails.filter(email => email.active),
    availableDomains: (state) => state.domains.filter(domain => domain.status === 1),
    emailCount: (state) => state.tempEmails.filter(email => email.active).length,
    unreadEmailCount: (state) => {
      // 这里可以添加未读邮件计数逻辑
      return state.currentEmails.length
    }
  },

  actions: {
    async fetchTempEmails() {
      this.isLoading = true
      try {
        const response = await emailApi.getTempEmails()
        this.tempEmails = response.data || []
        return response
      } catch (error) {
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createTempEmail(request: CreateEmailRequest) {
      this.isCreatingEmail = true
      try {
        const response = await emailApi.createTempEmail(request)
        if (response.data?.tempEmail) {
          this.tempEmails.unshift(response.data.tempEmail)
        }
        return response
      } catch (error) {
        throw error
      } finally {
        this.isCreatingEmail = false
      }
    },

    async deleteTempEmail(emailId: number) {
      try {
        await emailApi.deleteTempEmail(emailId)
        this.tempEmails = this.tempEmails.filter(email => email.id !== emailId)
        
        // 如果删除的是当前选中的邮箱，清除选中状态
        if (this.selectedTempEmail?.id === emailId) {
          this.selectedTempEmail = null
          this.currentEmails = []
        }
      } catch (error) {
        throw error
      }
    },

    async fetchEmailsForTempEmail(tempEmailId: number) {
      this.isLoading = true
      try {
        const response = await emailApi.getEmailsForTempEmail(tempEmailId)
        // response.data 是 PaginatedResponse<Email>，需要取其中的 data 属性
        this.currentEmails = response.data?.data || []

        // 设置当前选中的临时邮箱
        const tempEmail = this.tempEmails.find(email => email.id === tempEmailId)
        if (tempEmail) {
          this.selectedTempEmail = tempEmail
        }

        return response
      } catch (error) {
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchDomains() {
      try {
        const response = await emailApi.getDomains()
        this.domains = response.data || []
        return response
      } catch (error) {
        throw error
      }
    },

    async deleteEmail(emailId: number) {
      try {
        await emailApi.deleteEmail(emailId)
        this.currentEmails = this.currentEmails.filter(email => email.id !== emailId)
      } catch (error) {
        throw error
      }
    },

    // 添加新邮件到当前邮件列表（用于实时推送）
    addNewEmail(email: Email) {
      // 检查是否是当前选中临时邮箱的邮件
      if (this.selectedTempEmail && email.temp_email_id === this.selectedTempEmail.id) {
        this.currentEmails.unshift(email)
      }
    },

    // 清除当前选中的邮箱和邮件
    clearCurrentSelection() {
      this.selectedTempEmail = null
      this.currentEmails = []
    },

    // 设置选中的临时邮箱
    setSelectedTempEmail(tempEmail: TempEmail | null) {
      this.selectedTempEmail = tempEmail
      if (!tempEmail) {
        this.currentEmails = []
      }
    },

    // 兑换配额码
    async redeemCode(request: RedeemRequest) {
      try {
        const response = await emailApi.redeemCode(request)
        return response
      } catch (error) {
        throw error
      }
    }
  },

  persist: {
    key: 'email-store',
    storage: sessionStorage,
    pick: ['domains'] // 只持久化域名数据，其他数据每次重新获取
  }
})
