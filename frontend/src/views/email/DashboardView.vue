<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { useAuthStore } from '@/stores/auth'
import { useUserQueries } from '@/composables/useUserQueries'
import { useQuota } from '@/composables/useQuota'
import { useAnnouncement } from '@/composables/useAnnouncement'
import { usePublicSettings } from '@/composables/usePublicSettings'
import { ElMessage, ElMessageBox } from 'element-plus'
import TempEmailList from '@/components/email/TempEmailList.vue'
import EmailList from '@/components/email/EmailList.vue'
import RedeemCodeDialog from '@/components/email/RedeemCodeDialog.vue'
import type { CreateEmailRequest, TempEmail } from '@/types'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const emailStore = useEmailStore()
const authStore = useAuthStore()
const { updateUserQuotaOptimistic } = useUserQueries()
const {
  quotaInfo,
  loading: quotaLoading,
  ready: quotaReady,
  fetchQuotaInfo,
  refreshQuotaInfo,
} = useQuota()
const { checkAndShowAnnouncement } = useAnnouncement()
const publicSettings = usePublicSettings()

const loading = ref(false)

const showRedeemDialog = ref(false)
const isCreatingInline = ref(false)
const selectedDomainId = ref(0)
const deletingEmailId = ref<number | null>(null)

const selectedTempEmail = computed(() => emailStore.selectedTempEmail)
const currentEmails = computed(() => emailStore.currentEmails)
const publicInboxRequiresTurnstile = computed(
  () =>
    publicSettings.settings.value.turnstileEnabled &&
    publicSettings.settings.value.turnstilePublicInboxEnabled,
)

onMounted(async () => {
  await Promise.allSettled([
    loadData(),
    fetchQuotaInfo(), // 确保配额信息被正确获取
    // 配置读取失败时按“不需要验证”展示警告，避免给用户虚假的安全承诺。
    publicSettings.load().catch(() => undefined),
  ])

  // 设置默认选中的域名
  if (emailStore.availableDomains.length > 0) {
    selectedDomainId.value = emailStore.availableDomains[0].id
  }

  // 页面主数据就绪后异步检查公告，不遗留跨页面定时器。
  void checkAndShowAnnouncement()
})

const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([emailStore.fetchTempEmails(), emailStore.fetchDomains()])
  } catch (error) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSelectEmail = async (tempEmail: TempEmail) => {
  try {
    await emailStore.fetchEmailsForTempEmail(tempEmail.id)
  } catch (error) {
    console.error('Fetch emails error:', error)
    ElMessage.error('获取邮件列表失败')
  }
}

const handleEmailPageChange = async (page: number) => {
  if (!selectedTempEmail.value || emailStore.isLoading) return
  try {
    await emailStore.fetchEmailsForTempEmail(selectedTempEmail.value.id, page)
  } catch (error) {
    console.error('Fetch email page error:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取邮件分页失败')
  }
}

const handleDeleteTempEmail = async (tempEmail: TempEmail) => {
  if (deletingEmailId.value !== null) return
  try {
    await ElMessageBox.confirm(
      `确定删除 ${tempEmail.email} 吗？该地址会立即停止收信，并在下一轮清理中连同邮件永久删除；已消耗配额不会返还。`,
      '删除临时邮箱',
      {
        confirmButtonText: '删除邮箱',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    deletingEmailId.value = tempEmail.id
    const wasSelected = selectedTempEmail.value?.id === tempEmail.id
    await emailStore.deleteTempEmail(tempEmail.id)
    if (wasSelected) {
      const nextEmail = emailStore.activeTempEmails[0]
      if (nextEmail) {
        emailStore.setSelectedTempEmail(nextEmail)
        await emailStore.fetchEmailsForTempEmail(nextEmail.id)
      }
    }
    ElMessage.success('临时邮箱已停用，将在下一轮清理中永久删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Delete temp email error:', error)
      ElMessage.error(error instanceof Error ? error.message : '删除临时邮箱失败')
    }
  } finally {
    deletingEmailId.value = null
  }
}

const handleTogglePublicInbox = async (tempEmail: TempEmail, enabled: boolean) => {
  try {
    if (enabled) {
      await ElMessageBox.confirm(
        publicInboxRequiresTurnstile.value
          ? '开启后，任何知道该邮箱地址并通过人机验证的人，都可以查看此邮箱收到的邮件和验证码。'
          : '开启后，任何知道该邮箱地址的人无需登录或人机验证，就可以查看此邮箱收到的邮件和验证码。请勿用于接收敏感信息。',
        '开启公开收件箱',
        {
          confirmButtonText: '开启',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    }

    const response = await emailStore.updateTempEmailPublicInbox(tempEmail.id, enabled)
    const updatedEmail = response.data

    if (updatedEmail && emailStore.selectedTempEmail?.id === updatedEmail.id) {
      emailStore.setSelectedTempEmail(updatedEmail)
    }

    ElMessage.success(enabled ? '公开收件箱已开启' : '公开收件箱已关闭')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Toggle public inbox error:', error)
      ElMessage.error(error instanceof Error ? error.message : '更新公开收件箱失败')
    }
  }
}

const handleEmailRefresh = async () => {
  if (selectedTempEmail.value) {
    try {
      await emailStore.fetchEmailsForTempEmail(
        selectedTempEmail.value.id,
        emailStore.currentEmailPage,
      )
      ElMessage.success('邮件列表刷新成功')
    } catch (error) {
      console.error('Refresh emails error:', error)
      ElMessage.error('刷新邮件列表失败')
    }
  }
}

const handleRedeemSuccess = async (data?: { quota: number }) => {
  showRedeemDialog.value = false

  // 如果有返回配额信息，直接更新；否则刷新用户信息
  if (data?.quota !== undefined) {
    updateUserQuotaOptimistic(data.quota)
    await refreshQuotaInfo()
    ElMessage.success('兑换码使用成功')
  } else {
    await authStore.fetchCurrentUser() // 刷新用户信息以更新配额
    await refreshQuotaInfo() // 同时刷新配额缓存
    ElMessage.success('兑换码使用成功')
  }
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

  isCreatingInline.value = true

  try {
    const request: CreateEmailRequest = {
      domainId: targetDomainId
    }

    const response = await emailStore.createTempEmail(request)

    if (response.data?.userQuota !== undefined) {
      updateUserQuotaOptimistic(response.data.userQuota)
    }

    await refreshQuotaInfo()

    // 自动选中新创建的邮箱并复制地址
    if (response.data?.tempEmail) {
      const newTempEmail = response.data.tempEmail

      // 自动选中新创建的邮箱
      emailStore.setSelectedTempEmail(newTempEmail)

      // 自动复制邮箱地址到剪贴板
      try {
        await navigator.clipboard.writeText(newTempEmail.email)

        // 显示成功通知（包含复制成功的信息）
        ElMessage({
          message: `临时邮箱创建成功！邮箱地址 ${newTempEmail.email} 已复制到剪贴板`,
          type: 'success',
          duration: 4000,
          showClose: true
        })
      } catch (copyError) {
        console.error('Copy failed:', copyError)
        // 如果复制失败，只显示创建成功的消息
        ElMessage.success(`临时邮箱创建成功: ${newTempEmail.email}`)
      }

      // 自动获取该邮箱的邮件列表
      try {
        await emailStore.fetchEmailsForTempEmail(newTempEmail.id)
      } catch (fetchError) {
        console.error('Failed to fetch emails for new temp email:', fetchError)
        // 不影响主流程，只是获取邮件失败
      }
    } else {
      // 兜底处理：如果没有返回邮箱信息
      ElMessage.success('临时邮箱创建成功')
    }

  } catch (error) {
    console.error('Create email error:', error)

    // 提供更详细的错误信息
    let errorMessage = '创建失败'
    const message = error instanceof Error ? error.message : ''
    if (message) {
      if (message.includes('配额不足')) {
        errorMessage = '配额不足，请先兑换配额码'
      } else if (message.includes('域名')) {
        errorMessage = '域名无效，请重新选择'
      } else if (message.includes('网络')) {
        errorMessage = '网络连接失败，请检查网络后重试'
      } else {
        errorMessage = message
      }
    }

    ElMessage.error(errorMessage)

  } finally {
    isCreatingInline.value = false
  }
}

// 随机创建邮箱（随机选择域名）
const handleRandomCreateEmail = async () => {
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

  if (emailStore.availableDomains.length === 0) {
    ElMessage.error('暂无可用域名')
    return
  }

  // 随机选择一个域名
  const randomIndex = Math.floor(Math.random() * emailStore.availableDomains.length)
  const randomDomainId = emailStore.availableDomains[randomIndex].id

  await handleInlineCreateEmail(randomDomainId)
}

// 删除了 handleCreateCommand 函数，因为现在直接调用对应的方法


</script>

<template>
  <div class="dashboard-page max-w-1500px mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-full">
    <!-- Header -->
    <div
      class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 mt-4"
    >
      <div class="px-6 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <!-- Title Section -->
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">邮箱管理</h1>
            <p class="text-sm text-gray-600 dark:text-gray-400">管理您的临时邮箱和接收的邮件</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <el-button @click="showRedeemDialog = true" type="primary" size="default">
              <font-awesome-icon :icon="['fas', 'gift']" class="mr-2" />
              兑换配额
            </el-button>
          </div>
        </div>

        <!-- Quota Cards -->
        <div v-if="quotaLoading && !quotaReady" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6" aria-label="正在加载配额">
          <div v-for="index in 3" :key="index" class="quota-summary-skeleton">
            <el-skeleton animated>
              <template #template>
                <div class="flex items-center gap-4">
                  <el-skeleton-item variant="circle" style="width: 48px; height: 48px" />
                  <div class="flex-1"><el-skeleton-item variant="text" style="width: 54%" /><el-skeleton-item variant="h1" style="width: 72%; margin-top: 8px" /></div>
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div
            class="quota-summary-card"
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
            class="quota-summary-card"
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
            class="quota-summary-card"
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
    <div class="dashboard-content flex-1 py-6">
      <div class="mailbox-grid">
        <!-- Temp Email List -->
        <div class="mailbox-panel group relative">
          <div
            class="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden"
          >
            <!-- 顶部装饰条 -->
            <div class="h-1 flex-shrink-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>

            <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <div class="flex flex-col gap-4">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <font-awesome-icon :icon="['fas', 'inbox']" class="text-white text-lg" />
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">临时邮箱</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">点击邮箱查看收到的邮件</p>
                  </div>
                </div>
                <div class="mailbox-create-controls">
                  <!-- 指定域名创建 -->
                  <div class="mailbox-create-row">
                    <el-select
                      v-model="selectedDomainId"
                      placeholder="选择域名"
                      class="mailbox-domain-select"
                      aria-label="邮箱域名"
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
                      type="primary"
                      :loading="isCreatingInline"
                      :disabled="!quotaReady || quotaInfo.remaining <= 0 || !selectedDomainId"
                      @click="handleInlineCreateEmail()"
                      class="flex-1"
                    >
                      <font-awesome-icon
                        v-if="!isCreatingInline"
                        :icon="['fas', 'at']"
                        class="mr-2"
                      />
                      {{ isCreatingInline ? '创建中...' : '使用指定域名创建' }}
                    </el-button>
                  </div>

                  <!-- 随机域名创建 -->
                  <div class="flex items-center">
                    <el-button
                      type="success"
                      :loading="isCreatingInline"
                      :disabled="!quotaReady || quotaInfo.remaining <= 0"
                      @click="handleRandomCreateEmail()"
                      class="w-full"
                      plain
                    >
                      <font-awesome-icon
                        v-if="!isCreatingInline"
                        :icon="['fas', 'dice']"
                        class="mr-2"
                      />
                      {{ isCreatingInline ? '创建中...' : '随机域名创建（推荐）' }}
                    </el-button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex-1 min-h-0 overflow-hidden">
              <TempEmailList
                :loading="loading"
                :deleting-id="deletingEmailId"
                @select="handleSelectEmail"
                @toggle-public-inbox="handleTogglePublicInbox"
                @delete="handleDeleteTempEmail"
              />
            </div>
          </div>
        </div>

        <!-- Email List -->
        <div class="mailbox-panel group relative">
          <div
            class="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden"
          >
            <!-- 顶部装饰条 -->
            <div class="h-1 flex-shrink-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>

            <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center space-x-3 min-w-0">
                  <div
                    class="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'envelope-open-text']"
                      class="text-white text-lg"
                    />
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">邮件列表</h2>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      <span v-if="selectedTempEmail" class="flex items-center space-x-2">
                        <font-awesome-icon :icon="['fas', 'at']" class="text-green-500 text-xs" />
                        <span class="font-medium truncate" :title="selectedTempEmail.email">{{ selectedTempEmail.email }}</span>
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
                <div v-if="selectedTempEmail" class="flex items-center gap-2 flex-shrink-0">
                  <el-button
                    @click="handleEmailRefresh"
                    :disabled="emailStore.isLoading"
                    size="default"
                    circle
                    class="shadow-md hover:shadow-lg transition-shadow"
                    title="刷新邮件列表"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'refresh']"
                      :class="{ 'animate-spin': emailStore.isLoading }"
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
                :page="emailStore.currentEmailPage"
                :page-size="emailStore.currentEmailPageSize"
                :total="emailStore.currentEmailTotal"
                @page-change="handleEmailPageChange"
              />

              <div v-else class="flex items-center justify-center h-full p-6">
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

<style scoped>
.mailbox-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.mailbox-panel {
  min-width: 0;
  height: max(36rem, calc(100dvh - 20rem));
  container-type: inline-size;
}

.mailbox-panel > div {
  border-style: solid;
}

.mailbox-create-controls {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.mailbox-create-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.mailbox-domain-select {
  width: 100%;
  min-width: 0;
}

.mailbox-create-controls :deep(.el-button) {
  width: 100%;
  margin: 0;
}

@container (max-width: 380px) {
  .mailbox-create-row {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1023px) {
  .mailbox-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .mailbox-panel {
    height: 36rem;
  }
}
</style>
