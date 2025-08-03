<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { useAuthStore } from '@/stores/auth'
import { useUserQueries } from '@/composables/useUserQueries'
import { ElMessage, ElMessageBox } from 'element-plus'
import TempEmailList from '@/components/email/TempEmailList.vue'
import EmailList from '@/components/email/EmailList.vue'

import RedeemCodeDialog from '@/components/email/RedeemCodeDialog.vue'
import type { CreateEmailRequest } from '@/types'

const emailStore = useEmailStore()
const authStore = useAuthStore()
const { updateUserQuotaOptimistic } = useUserQueries()

const loading = ref(false)

const showRedeemDialog = ref(false)
const isCreatingInline = ref(false)
const selectedDomainId = ref(0)

const quotaInfo = computed(() => ({
  total: authStore.userQuota,
  used: emailStore.emailCount,
  remaining: authStore.userQuota - emailStore.emailCount,
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
    await Promise.all([emailStore.fetchTempEmails(), emailStore.fetchDomains()])
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

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('邮箱地址已复制到剪贴板')
  } catch (error) {
    console.error('Copy failed:', error)
    ElMessage.error('复制失败')
  }
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
      turnstileToken: 'dev-token',
    }

    console.log('Sending create email request:', request)
    const response = await emailStore.createTempEmail(request)
    console.log('Create email response:', response)

    // 🔥 使用后端返回的最新配额信息更新前端
    if (response.data?.userQuota !== undefined) {
      updateUserQuotaOptimistic(response.data.userQuota)
    }

    // 只需要刷新邮箱数据，配额已经通过乐观更新了
    await loadData()

    ElMessage.success(`临时邮箱创建成功: ${response.data?.tempEmail?.email || '新邮箱'}`)

    // 成功后重置状态
    isCreatingInline.value = false
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

    // 错误后重置状态
    isCreatingInline.value = false
  }
}
</script>

<template>
  <div class="max-w-1500px mx-auto px-4 sm:px-6 lg:px-8 flex flex-col h-full">
    <!-- Header -->
    <div
      class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Title Section -->
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">邮箱管理</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">管理您的临时邮箱和接收的邮件</p>
          </div>

          <!-- Action Button -->
          <el-button @click="showRedeemDialog = true" type="primary" size="default">
            <font-awesome-icon :icon="['fas', 'gift']" class="mr-2" />
            兑换配额
          </el-button>
        </div>

        <!-- Quota Cards -->
        <div class="grid grid-cols-3 gap-4 mt-6">
          <div
            class="transition-all duration-300 hover:shadow-xl hover:scale-[1.01] bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div class="flex items-center">
              <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总配额</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ quotaInfo.total }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="transition-all duration-300 hover:shadow-xl hover:scale-[1.01] bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div class="flex items-center">
              <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'check-circle']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">已使用</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ quotaInfo.used }}
                </p>
              </div>
            </div>
          </div>

          <div
            class="transition-all duration-300 hover:shadow-xl hover:scale-[1.01] bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div class="flex items-center">
              <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mr-4">
                <font-awesome-icon :icon="['fas', 'clock']" class="text-white text-lg" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">剩余配额</p>
                <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ quotaInfo.remaining }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 py-6 overflow-hidden">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full overflow-hidden">
        <!-- Temp Email List -->
        <div class="group relative h-ful overflow-hidden">
          <div
            class="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.01] border border-gray-200/50 dark:border-gray-700/50 flex flex-col h-full overflow-hidden"
          >
            <!-- 顶部装饰条 -->
            <div class="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>

            <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <font-awesome-icon :icon="['fas', 'inbox']" class="text-white text-lg" />
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">临时邮箱</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">点击邮箱查看收到的邮件</p>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <el-select
                    v-model="selectedDomainId"
                    placeholder="选择域名"
                    style="width: 160px"
                    :disabled="emailStore.availableDomains.length === 0"
                    size="default"
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
                    class="flex-1"
                  >
                    <font-awesome-icon
                      v-if="!isCreatingInline"
                      :icon="['fas', 'plus']"
                      class="mr-2"
                    />
                    {{ isCreatingInline ? '创建中...' : '快速创建' }}
                  </el-button>
                </div>
              </div>
            </div>

            <div class="flex-1 overflow-hidden">
              <TempEmailList :loading="loading" @select="handleSelectEmail" />
            </div>
          </div>
        </div>

        <!-- Email List -->
        <div class="group relative h-ful overflow-hidden">
          <div
            class="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-[1.01] border border-gray-200/50 dark:border-gray-700/50 flex flex-col h-full overflow-hidden"
          >
            <!-- 顶部装饰条 -->
            <div class="h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>

            <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'envelope-open-text']"
                      class="text-white text-lg"
                    />
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">邮件列表</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      <span v-if="selectedTempEmail" class="flex items-center space-x-2">
                        <font-awesome-icon :icon="['fas', 'at']" class="text-green-500 text-xs" />
                        <span class="font-medium">{{ selectedTempEmail.email }}</span>
                        <el-button
                          @click.stop="copyToClipboard(selectedTempEmail.email)"
                          size="small"
                          circle
                          class="ml-2 hover:bg-green-100 dark:hover:bg-green-900/30"
                          title="复制邮箱地址"
                        >
                          <font-awesome-icon
                            :icon="['fas', 'copy']"
                            class="text-green-500 text-xs"
                          />
                        </el-button>
                      </span>
                    </p>
                  </div>
                </div>

                <!-- 刷新按钮 - 只在选中临时邮箱时显示 -->
                <div v-if="selectedTempEmail" class="flex items-center gap-2">
                  <el-button
                    @click="handleRefresh"
                    :disabled="loading"
                    size="default"
                    circle
                    class="shadow-md hover:shadow-lg transition-shadow"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'refresh']"
                      :class="{ 'animate-spin': loading }"
                    />
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
                <div class="text-center max-w-sm">
                  <div class="relative mb-8">
                    <div
                      class="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner"
                    >
                      <font-awesome-icon
                        :icon="['fas', 'envelope-open']"
                        class="text-4xl text-gray-400 dark:text-gray-500"
                      />
                    </div>
                  </div>

                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    选择邮箱开始查看
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400 leading-relaxed">
                    从左侧选择一个临时邮箱，即可在此处查看收到的所有邮件
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <RedeemCodeDialog v-model="showRedeemDialog" @success="handleRedeemSuccess" />
  </div>
</template>
