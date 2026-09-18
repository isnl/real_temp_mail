<script lang="ts" setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
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
const compactMailbox = useMediaQuery('(max-width: 1100px)')
const mobilePane = ref<'mailboxes' | 'messages'>('mailboxes')
const workbench = ref<HTMLElement | null>(null)
const showPane = async (pane: 'mailboxes' | 'messages') => {
  mobilePane.value = pane
  if (compactMailbox.value) {
    await nextTick()
    workbench.value
      ?.querySelector<HTMLButtonElement>('.mailbox-mobile-tabs button[aria-pressed="true"]')
      ?.focus({ preventScroll: true })
    workbench.value?.scrollIntoView({ block: 'start' })
  }
}

const showRedeemDialog = ref(false)
const isCreatingInline = ref(false)
const selectedDomainId = ref(0)
const deletingEmailId = ref<number | null>(null)

const selectedTempEmail = computed(() => emailStore.selectedTempEmail)
const currentEmails = computed(() => emailStore.currentEmails)
watch(selectedTempEmail, (email) => {
  if (!email) mobilePane.value = 'mailboxes'
})
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
  void showPane('messages')
  try {
    await emailStore.fetchEmailsForTempEmail(tempEmail.id)
    if (
      compactMailbox.value &&
      mobilePane.value === 'messages' &&
      selectedTempEmail.value?.id === tempEmail.id
    ) {
      void showPane('messages')
    }
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
      domainId: targetDomainId,
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
      void showPane('messages')

      // 自动复制邮箱地址到剪贴板
      try {
        await navigator.clipboard.writeText(newTempEmail.email)

        // 显示成功通知（包含复制成功的信息）
        ElMessage({
          message: `临时邮箱创建成功！邮箱地址 ${newTempEmail.email} 已复制到剪贴板`,
          type: 'success',
          duration: 4000,
          showClose: true,
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
  <div class="dashboard-page">
    <div class="console-quota-row">
      <div class="console-quota-grid" :aria-busy="quotaLoading && !quotaReady">
        <div
          v-for="(item, index) in [
            { label: '总配额', value: quotaInfo.total },
            { label: '已使用', value: quotaInfo.used },
            { label: '剩余配额', value: quotaInfo.remaining },
          ]"
          :key="item.label"
          class="console-quota-stat"
          :class="{ 'is-remaining': index === 2 }"
        >
          <span>{{ item.label }}</span>
          <el-skeleton v-if="quotaLoading && !quotaReady" animated :rows="0" />
          <strong v-else>{{ item.value.toLocaleString('zh-CN') }}</strong>
        </div>
      </div>
      <el-button type="primary" class="console-redeem" @click="showRedeemDialog = true">
        <font-awesome-icon icon="gift" />兑换配额
      </el-button>
    </div>

    <div ref="workbench" class="mailbox-workbench">
      <div v-if="compactMailbox" class="mailbox-mobile-tabs" aria-label="收件工作区">
        <button
          type="button"
          :aria-pressed="mobilePane === 'mailboxes'"
          @click="showPane('mailboxes')"
        >
          <font-awesome-icon icon="inbox" />邮箱
          <span>{{ emailStore.activeTempEmails.length }}</span>
        </button>
        <button
          type="button"
          :aria-pressed="mobilePane === 'messages'"
          :disabled="!selectedTempEmail"
          @click="showPane('messages')"
        >
          <font-awesome-icon icon="envelope" />邮件
        </button>
      </div>
      <div class="mailbox-grid">
        <section
          v-show="!compactMailbox || mobilePane === 'mailboxes'"
          class="mailbox-panel mailbox-addresses"
          aria-label="临时邮箱"
        >
          <header class="mailbox-panel-heading">
            <h2><font-awesome-icon icon="inbox" />临时邮箱</h2>
            <span class="mailbox-count">{{ emailStore.activeTempEmails.length }}</span>
          </header>
          <div class="mailbox-create-controls">
            <div class="mailbox-create-row">
              <el-select
                v-model="selectedDomainId"
                placeholder="选择域名"
                class="mailbox-domain-select"
                aria-label="邮箱域名"
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
                type="primary"
                :loading="isCreatingInline"
                :disabled="!quotaReady || quotaInfo.remaining <= 0 || !selectedDomainId"
                @click="handleInlineCreateEmail()"
              >
                <font-awesome-icon v-if="!isCreatingInline" icon="plus" />创建
              </el-button>
            </div>
            <el-button
              plain
              :loading="isCreatingInline"
              :disabled="!quotaReady || quotaInfo.remaining <= 0"
              @click="handleRandomCreateEmail"
            >
              <font-awesome-icon v-if="!isCreatingInline" icon="dice" />随机域名创建
            </el-button>
          </div>
          <div class="mailbox-body">
            <TempEmailList
              :loading="loading"
              :deleting-id="deletingEmailId"
              @select="handleSelectEmail"
              @toggle-public-inbox="handleTogglePublicInbox"
              @delete="handleDeleteTempEmail"
            />
          </div>
        </section>

        <section
          v-show="!compactMailbox || mobilePane === 'messages'"
          class="mailbox-panel mailbox-messages"
          aria-label="邮件列表"
        >
          <header class="mailbox-panel-heading">
            <div class="mailbox-heading-copy">
              <h2><font-awesome-icon icon="envelope-open-text" />邮件列表</h2>
              <span v-if="selectedTempEmail" class="mailbox-selected-address">{{
                selectedTempEmail.email
              }}</span>
            </div>
            <div v-if="selectedTempEmail" class="mailbox-heading-actions">
              <button
                type="button"
                class="mailbox-icon-button"
                aria-label="复制邮箱地址"
                @click="copyToClipboard(selectedTempEmail.email)"
              >
                <font-awesome-icon icon="copy" />
              </button>
              <button
                type="button"
                class="mailbox-icon-button"
                aria-label="刷新邮件"
                :disabled="emailStore.isLoading"
                @click="handleEmailRefresh"
              >
                <font-awesome-icon
                  icon="refresh"
                  :class="{ 'animate-spin': emailStore.isLoading }"
                />
              </button>
            </div>
          </header>
          <div class="mailbox-body">
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
            <div v-else class="mailbox-empty">
              <font-awesome-icon icon="envelope-open" />
              <h3>选择一个邮箱</h3>
              <p>在邮箱列表中选择地址，查看收到的邮件。</p>
            </div>
          </div>
        </section>
      </div>
    </div>
    <RedeemCodeDialog v-model="showRedeemDialog" @success="handleRedeemSuccess" />
  </div>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 20px;
  min-width: 0;
}
.console-quota-row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.console-quota-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  flex: 1;
  min-width: 0;
}
.console-quota-stat {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 4px 24px;
  border-right: 1px solid var(--border);
}
.console-quota-stat:first-child {
  padding-left: 0;
}
.console-quota-stat:last-child {
  border: 0;
}
.console-quota-stat > span {
  color: var(--text-secondary);
  font-size: 13px;
}
.console-quota-stat strong {
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 650;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.console-quota-stat.is-remaining strong {
  color: var(--brand-link);
}
.console-redeem svg {
  margin-right: 8px;
}
.mailbox-workbench {
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface);
}
.mailbox-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.4fr);
}
.mailbox-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: max(32rem, calc(100dvh - 12rem));
}
.mailbox-addresses {
  border-right: 1px solid var(--border);
}
.mailbox-panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 72px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.mailbox-panel-heading h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 650;
}
.mailbox-panel-heading h2 > svg {
  color: var(--brand-link);
  font-size: 16px;
}
.mailbox-count {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 12px;
}
.mailbox-heading-copy {
  min-width: 0;
}
.mailbox-selected-address {
  display: block;
  margin-top: 5px;
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  font-size: 12px;
}
.mailbox-heading-actions {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
}
.mailbox-create-controls {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.mailbox-create-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}
.mailbox-domain-select {
  width: 100%;
  min-width: 0;
}
.mailbox-create-controls :deep(.el-button) {
  margin: 0;
}
.mailbox-create-controls :deep(.el-button svg) {
  margin-right: 6px;
}
.mailbox-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.mailbox-mobile-tabs {
  display: flex;
  gap: 4px;
  padding: 6px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}
.mailbox-mobile-tabs button {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  font-size: 14px;
  font-weight: 600;
}
.mailbox-mobile-tabs button[aria-pressed='true'] {
  color: var(--brand-link);
  background: var(--surface);
}
.mailbox-mobile-tabs button:disabled {
  opacity: 0.45;
  cursor: default;
}
.mailbox-mobile-tabs span {
  font-size: 12px;
}
@media (max-width: 1100px) {
  .mailbox-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .mailbox-panel {
    height: auto;
    min-height: 300px;
  }
  .mailbox-addresses {
    border-right: 0;
  }
  .mailbox-body {
    overflow: visible;
  }
  .mailbox-panel-heading {
    padding: 14px 16px;
    min-height: 60px;
  }
}
@media (max-width: 600px) {
  .dashboard-page {
    gap: 14px;
  }
  .console-quota-row {
    flex-wrap: wrap;
    gap: 12px;
  }
  .console-quota-grid {
    flex-basis: 100%;
  }
  .console-quota-stat {
    padding: 2px 14px;
  }
  .console-quota-stat > span {
    font-size: 12px;
  }
  .console-redeem {
    margin-left: auto;
  }
  .mailbox-workbench {
    border-radius: 10px;
  }
  .mailbox-panel-heading {
    padding: 12px;
  }
  .mailbox-panel-heading h2 {
    font-size: 15px;
  }
  .mailbox-create-controls {
    padding: 12px;
  }
}
</style>
