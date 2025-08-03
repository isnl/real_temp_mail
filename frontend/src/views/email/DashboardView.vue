<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import TempEmailList from '@/components/email/TempEmailList.vue'
import EmailList from '@/components/email/EmailList.vue'

import RedeemCodeDialog from '@/components/email/RedeemCodeDialog.vue'
import type { CreateEmailRequest } from '@/types'

const emailStore = useEmailStore()
const authStore = useAuthStore()

const loading = ref(false)

const showRedeemDialog = ref(false)
const isCreatingInline = ref(false)
const selectedDomainId = ref(0)

const quotaInfo = computed(() => ({
  total: authStore.userQuota,
  used: emailStore.emailCount,
  remaining: authStore.userQuota - emailStore.emailCount
}))

const selectedTempEmail = computed(() => emailStore.selectedTempEmail)
const currentEmails = computed(() => emailStore.currentEmails)

onMounted(async () => {
  await loadData()
  // 设置默认选中的域名
  if (emailStore.availableDomains.length > 0) {
    selectedDomainId.value = emailStore.availableDomains[0].id
  }
})

const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      emailStore.fetchTempEmails(),
      emailStore.fetchDomains()
    ])
  } catch (error: any) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}


const handleSelectEmail = async (tempEmail: any) => {
  try {
    await emailStore.fetchEmailsForTempEmail(tempEmail.id)
  } catch (error: any) {
    console.error('Fetch emails error:', error)
    ElMessage.error('获取邮件列表失败')
  }
}

const handleRefresh = async () => {
  await loadData()
  if (selectedTempEmail.value) {
    await emailStore.fetchEmailsForTempEmail(selectedTempEmail.value.id)
  }
  ElMessage.success('刷新成功')
}

const handleRedeemSuccess = async () => {
  showRedeemDialog.value = false
  await authStore.refreshTokens() // 刷新用户信息以更新配额
  ElMessage.success('兑换码使用成功')
}

// 内联创建邮箱
const handleInlineCreateEmail = async (domainId?: number) => {
  if (quotaInfo.value.remaining <= 0) {
    ElMessage.warning('配额不足，请先兑换配额码')
    showRedeemDialog.value = true
    return
  }

  // 确保域名数据已加载
  if (emailStore.availableDomains.length === 0) {
    try {
      await emailStore.fetchDomains()
    } catch (error) {
      console.error('Failed to fetch domains:', error)
      ElMessage.error('获取域名列表失败，请刷新页面重试')
      return
    }
  }

  const targetDomainId = domainId || selectedDomainId.value || emailStore.availableDomains[0]?.id
  if (!targetDomainId) {
    ElMessage.error('请先选择域名')
    return
  }

  console.log('Creating email with domain ID:', targetDomainId)
  isCreatingInline.value = true

  try {
    const request: CreateEmailRequest = {
      domainId: targetDomainId,
      turnstileToken: 'dev-token'
    }

    console.log('Sending create email request:', request)
    const response = await emailStore.createTempEmail(request)
    console.log('Create email response:', response)

    // 刷新数据和用户配额
    await Promise.all([
      loadData(),
      authStore.refreshTokens()
    ])

    ElMessage.success(`临时邮箱创建成功: ${response.data?.email || '新邮箱'}`)
  } catch (error: any) {
    console.error('Create email error:', error)

    // 提供更详细的错误信息
    let errorMessage = '创建失败'
    if (error.message) {
      if (error.message.includes('配额不足')) {
        errorMessage = '配额不足，请先兑换配额码'
      } else if (error.message.includes('域名')) {
        errorMessage = '域名无效，请重新选择'
      } else if (error.message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络后重试'
      } else {
        errorMessage = error.message
      }
    }

    ElMessage.error(errorMessage)
  } finally {
    isCreatingInline.value = false
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-full">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Title Section -->
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              邮箱管理
            </h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              管理您的临时邮箱和接收的邮件
            </p>
          </div>

          <!-- Action Button -->
          <el-button
            @click="showRedeemDialog = true"
            type="primary"
            size="default"
          >
            <font-awesome-icon :icon="['fas', 'gift']" class="mr-2" />
            兑换配额
          </el-button>
        </div>

        <!-- Quota Cards -->
        <div class="grid grid-cols-3 gap-4 mt-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总配额</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ quotaInfo.total }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'check-circle']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">已使用</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ quotaInfo.used }}</p>
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="flex items-center">
              <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'clock']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">剩余配额</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ quotaInfo.remaining }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 min-h-0">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <!-- Temp Email List -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  临时邮箱列表
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  点击邮箱查看收到的邮件
                </p>
              </div>
            </div>

            <!-- Quick Create Section -->
            <div class="flex items-center space-x-3">
              <el-select
                v-model="selectedDomainId"
                placeholder="选择域名"
                style="width: 160px;"
                :disabled="emailStore.availableDomains.length === 0"
              >
                <el-option
                  v-for="domain in emailStore.availableDomains"
                  :key="domain.id"
                  :label="`@${domain.domain}`"
                  :value="domain.id"
                />
              </el-select>

              <el-button
                @click="handleInlineCreateEmail()"
                type="primary"
                :loading="isCreatingInline"
                :disabled="quotaInfo.remaining <= 0 || !selectedDomainId"
              >
                <font-awesome-icon v-if="!isCreatingInline" :icon="['fas', 'plus']" class="mr-2" />
                {{ isCreatingInline ? '创建中...' : '快速创建' }}
              </el-button>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-hidden">
            <TempEmailList
              :loading="loading"
              @select="handleSelectEmail"
            />
          </div>
        </div>

        <!-- Email List -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
          <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  邮件列表
                </h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span v-if="selectedTempEmail">
                    {{ selectedTempEmail.email }} 的邮件
                  </span>
                  <span v-else>
                    请先选择一个临时邮箱
                  </span>
                </p>
              </div>

              <!-- 刷新按钮 - 只在选中临时邮箱时显示 -->
              <div v-if="selectedTempEmail" class="flex items-center gap-2">
                <el-button
                  @click="handleRefresh"
                  :disabled="loading"
                  size="small"
                >
                  <font-awesome-icon
                    :icon="['fas', 'refresh']"
                    :class="{ 'animate-spin': loading }"
                    class="mr-2"
                  />
                  刷新邮件
                </el-button>
              </div>
            </div>
          </div>

          <div class="flex-1 min-h-0 overflow-hidden">
            <EmailList
              v-if="selectedTempEmail"
              :temp-email-id="selectedTempEmail.id"
              :emails="currentEmails"
              :loading="emailStore.isLoading"
            />

            <div v-else class="flex items-center justify-center h-full">
              <div class="text-center">
                <font-awesome-icon
                  :icon="['fas', 'envelope-open']"
                  class="text-6xl text-gray-300 dark:text-gray-600 mb-4"
                />
                <p class="text-gray-500 dark:text-gray-400">
                  请选择一个临时邮箱查看邮件
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
    </div>

    <!-- Dialogs -->
    <RedeemCodeDialog
      v-model="showRedeemDialog"
      @success="handleRedeemSuccess"
    />
  </div>
</template>
