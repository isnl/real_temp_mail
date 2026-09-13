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
    isCreatingEmail: false,
    emailRequestId: 0,
    currentEmailPage: 1,
    currentEmailPageSize: 20,
    currentEmailTotal: 0,
  }),

  getters: {
    activeTempEmails: (state) => state.tempEmails.filter(email => email.active),
    availableDomains: (state) => state.domains.filter(domain => domain.status === 1),
    emailCount: (state) => state.tempEmails.filter(email => email.active).length,
    unreadEmailCount: (state) => state.currentEmails.filter((email) => !email.is_read).length,
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
          this.clearCurrentSelection()
        }
      } catch (error) {
        throw error
      }
    },

    async updateTempEmailPublicInbox(emailId: number, publicInboxEnabled: boolean) {
      try {
        const response = await emailApi.updateTempEmailPublicInbox(emailId, {
          publicInboxEnabled
        })

        if (response.data) {
          this.tempEmails = this.tempEmails.map(email =>
            email.id === emailId ? response.data! : email
          )

          if (this.selectedTempEmail?.id === emailId) {
            this.selectedTempEmail = response.data
          }
        }

        return response
      } catch (error) {
        throw error
      }
    },

    async fetchEmailsForTempEmail(tempEmailId: number, page = 1) {
      const requestId = ++this.emailRequestId
      const tempEmail = this.tempEmails.find((email) => email.id === tempEmailId)
      if (tempEmail) this.selectedTempEmail = tempEmail
      this.currentEmails = []
      this.isLoading = true
      try {
        const response = await emailApi.getEmailsForTempEmail(tempEmailId, {
          page,
          limit: this.currentEmailPageSize,
        })
        if (requestId !== this.emailRequestId) return response
        this.currentEmails = response.data?.data || []
        this.currentEmailPage = response.data?.page || page
        this.currentEmailTotal = Math.max(0, response.data?.total || 0)

        return response
      } catch (error) {
        if (requestId !== this.emailRequestId) return
        throw error
      } finally {
        if (requestId === this.emailRequestId) this.isLoading = false
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
      await emailApi.deleteEmail(emailId)
      this.currentEmails = this.currentEmails.filter(email => email.id !== emailId)
      this.currentEmailTotal = Math.max(0, this.currentEmailTotal - 1)
      if (this.selectedTempEmail) {
        const targetPage = this.currentEmails.length === 0 && this.currentEmailPage > 1
          ? this.currentEmailPage - 1
          : this.currentEmailPage
        try {
          await this.fetchEmailsForTempEmail(this.selectedTempEmail.id, targetPage)
        } catch (error) {
          // 删除已经在服务端成功，刷新失败不能把成功操作误报成删除失败。
          console.warn('Email deleted, but refreshing the page failed:', error)
        }
      }
    },

    async deleteEmails(emailIds: number[]) {
      const uniqueIds = [...new Set(emailIds.filter((id) => Number.isInteger(id) && id > 0))]
      if (!uniqueIds.length) return
      await emailApi.deleteEmails(uniqueIds)
      const deletedIds = new Set(uniqueIds)
      this.currentEmails = this.currentEmails.filter((email) => !deletedIds.has(email.id))
      this.currentEmailTotal = Math.max(0, this.currentEmailTotal - deletedIds.size)
      if (this.selectedTempEmail) {
        const targetPage = this.currentEmails.length === 0 && this.currentEmailPage > 1
          ? this.currentEmailPage - 1
          : this.currentEmailPage
        try {
          await this.fetchEmailsForTempEmail(this.selectedTempEmail.id, targetPage)
        } catch (error) {
          console.warn('Emails deleted, but refreshing the page failed:', error)
        }
      }
    },

    async markEmailAsRead(emailId: number) {
      const email = this.currentEmails.find((item) => item.id === emailId)
      if (!email || email.is_read) return

      email.is_read = true
      try {
        await emailApi.markEmailAsRead(emailId)
      } catch (error) {
        const currentEmail = this.currentEmails.find((item) => item.id === emailId)
        if (currentEmail) currentEmail.is_read = false
        throw error
      }
    },

    // 清除当前选中的邮箱和邮件
    clearCurrentSelection() {
      this.emailRequestId += 1
      this.selectedTempEmail = null
      this.currentEmails = []
      this.currentEmailPage = 1
      this.currentEmailTotal = 0
    },

    // 设置选中的临时邮箱
    setSelectedTempEmail(tempEmail: TempEmail | null) {
      if (this.selectedTempEmail?.id !== tempEmail?.id) {
        this.emailRequestId += 1
        this.currentEmails = []
        this.currentEmailPage = 1
        this.currentEmailTotal = 0
      }
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
