<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEmailStore } from '@/stores/email'
import { emailApi } from '@/api/email'
import type { EmailMessage } from '@/types'
import EmailDetailDialog from './EmailDetailDialog.vue'

interface Props {
  tempEmailId: number
  emails: EmailMessage[]
  loading?: boolean
  readonly?: boolean
  detailLoader?: (email: EmailMessage) => Promise<EmailMessage>
  page?: number
  pageSize?: number
  total?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  readonly: false,
  page: 1,
  pageSize: 20,
})

const emit = defineEmits<{
  (event: 'pageChange', page: number): void
}>()

const emailStore = useEmailStore()

const selectedEmail = ref<EmailMessage | null>(null)
const showDetailDialog = ref(false)
const detailLoading = ref(false)
const selectedEmails = ref<number[]>([])
const selectAll = ref(false)
const detailCache = new Map<number, EmailMessage>()
let detailRequestVersion = 0

watch(
  () => props.emails.map((email) => email.id),
  (ids) => {
    const availableIds = new Set(ids)
    selectedEmails.value = selectedEmails.value.filter((id) => availableIds.has(id))
    selectAll.value = ids.length > 0 && selectedEmails.value.length === ids.length
    for (const cachedId of detailCache.keys()) {
      if (!availableIds.has(cachedId)) detailCache.delete(cachedId)
    }
    if (selectedEmail.value && !availableIds.has(selectedEmail.value.id)) {
      detailRequestVersion += 1
      selectedEmail.value = null
      showDetailDialog.value = false
      detailLoading.value = false
    }
  },
)

const sortedEmails = computed(() => {
  if (!props.emails || !Array.isArray(props.emails)) {
    return []
  }
  return [...props.emails].sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
  )
})

const displayTotal = computed(() => Math.max(0, props.total ?? props.emails.length))

const handleEmailClick = async (email: EmailMessage) => {
  const requestVersion = ++detailRequestVersion
  selectedEmail.value = detailCache.get(email.id) ?? email
  showDetailDialog.value = true
  if (!props.readonly && !Boolean(email.is_read)) {
    void emailStore.markEmailAsRead(email.id).catch(() => {
      ElMessage.warning('邮件已打开，但未读状态同步失败')
    })
  }
  if (detailCache.has(email.id)) return
  if (props.readonly && !props.detailLoader) return

  detailLoading.value = true
  try {
    const detail = props.detailLoader
      ? await props.detailLoader(email)
      : await emailApi.getEmailDetail(email.id).then((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.error || '获取邮件详情失败')
          }
          return response.data
        })
    if (requestVersion !== detailRequestVersion || !showDetailDialog.value) return
    detailCache.set(email.id, detail)
    selectedEmail.value = detail
  } catch (error) {
    if (requestVersion === detailRequestVersion) {
      ElMessage.error(error instanceof Error ? error.message : '获取邮件详情失败')
    }
  } finally {
    if (requestVersion === detailRequestVersion) detailLoading.value = false
  }
}

const handleDeleteEmail = async (emailId: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这封邮件吗？删除后无法恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await emailStore.deleteEmail(emailId)
    ElMessage.success('邮件删除成功')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Delete email error:', error)
      ElMessage.error(error instanceof Error ? error.message : '删除失败')
    }
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('Copy failed:', error)
    ElMessage.error('复制失败')
  }
}

const escapeCsvCell = (value: unknown) => {
  let text = String(value ?? '').replace(/\0/g, '')
  // Excel/LibreOffice 会执行以这些字符开头的单元格公式。
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

const exportEmails = () => {
  if (props.emails.length === 0) {
    ElMessage.warning('没有邮件可以导出')
    return
  }

  try {
    const emailData = props.emails.map((email) => ({
      发件人: email.sender,
      主题: email.subject || '无主题',
      内容: email.content || '无内容',
      验证码: email.verification_code || '无',
      接收时间: new Date(email.received_at).toLocaleString('zh-CN'),
      是否已读: email.is_read ? '是' : '否',
    }))

    const csvContent = [
      Object.keys(emailData[0]).map(escapeCsvCell).join(','),
      ...emailData.map((row) =>
        Object.values(row)
          .map(escapeCsvCell)
          .join(','),
      ),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    try {
      link.href = url
      link.download = `emails_${new Date().toISOString().slice(0, 10)}.csv`
      link.hidden = true
      document.body.appendChild(link)
      link.click()
    } finally {
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    }

    ElMessage.success('邮件导出成功')
  } catch (error) {
    console.error('Export failed:', error)
    ElMessage.error('导出失败')
  }
}

// 批量操作功能
const handleSelectAll = () => {
  if (selectAll.value) {
    selectedEmails.value = props.emails.map((email) => email.id)
  } else {
    selectedEmails.value = []
  }
}

const handleSelectEmail = (emailId: number, checked: boolean) => {
  if (checked) {
    selectedEmails.value.push(emailId)
  } else {
    selectedEmails.value = selectedEmails.value.filter((id) => id !== emailId)
  }

  // 更新全选状态
  selectAll.value = selectedEmails.value.length === props.emails.length
}

const handleBatchDelete = async () => {
  if (selectedEmails.value.length === 0) {
    ElMessage.warning('请先选择要删除的邮件')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedEmails.value.length} 封邮件吗？删除后无法恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await emailStore.deleteEmails(selectedEmails.value)

    selectedEmails.value = []
    selectAll.value = false
    ElMessage.success('批量删除成功')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      console.error('Batch delete error:', error)
      ElMessage.error(error instanceof Error ? error.message : '批量删除失败')
    }
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else {
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

const truncateText = (text: string, maxLength: number = 100) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const getEmailTypeIcon = (subject: string, content: string) => {
  const lowerSubject = subject?.toLowerCase() || ''
  const lowerContent = content?.toLowerCase() || ''

  if (
    lowerSubject.includes('verification') ||
    lowerSubject.includes('验证') ||
    lowerContent.includes('verification code') ||
    lowerContent.includes('验证码')
  ) {
    return { icon: 'shield-alt', color: 'text-green-500' }
  }

  if (
    lowerSubject.includes('reset') ||
    lowerSubject.includes('password') ||
    lowerSubject.includes('重置') ||
    lowerSubject.includes('密码')
  ) {
    return { icon: 'key', color: 'text-orange-500' }
  }

  if (
    lowerSubject.includes('welcome') ||
    lowerSubject.includes('confirm') ||
    lowerSubject.includes('欢迎') ||
    lowerSubject.includes('确认')
  ) {
    return { icon: 'user-plus', color: 'text-primary-500' }
  }

  return { icon: 'envelope', color: 'text-gray-500' }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div
      v-if="emails.length > 0 && !readonly"
      class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-primary-50/30 dark:from-gray-800/50 dark:to-primary-900/10"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-center sm:space-x-4">
          <div class="flex min-w-0 flex-wrap items-center gap-3">
            <el-checkbox
              v-model="selectAll"
              @change="handleSelectAll"
              :indeterminate="selectedEmails.length > 0 && selectedEmails.length < emails.length"
              class="font-medium"
            >
              全选
            </el-checkbox>

            <div class="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>

            <div class="flex items-center space-x-2">
              <div
                class="w-6 h-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm"
              >
                <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-xs" />
              </div>
              <div class="text-sm">
                <span
                  v-if="selectedEmails.length > 0"
                  class="font-semibold text-green-700 dark:text-green-300"
                >
                  已选择 {{ selectedEmails.length }} 封邮件
                </span>
                <span v-else class="font-medium text-gray-700 dark:text-gray-300">
                  共 {{ emails.length }} 封邮件
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 sm:justify-end">
          <el-button
            v-if="selectedEmails.length > 0"
            size="default"
            type="danger"
            @click="handleBatchDelete"
            :disabled="loading"
            class="shadow-sm"
          >
            <font-awesome-icon icon="trash" class="mr-2" />
            批量删除 ({{ selectedEmails.length }})
          </el-button>

          <el-button size="default" @click="exportEmails" :disabled="loading" class="shadow-sm">
            <font-awesome-icon icon="download" class="mr-2" />
            导出邮件
          </el-button>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div v-if="loading" class="p-6">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="emails.length === 0" class="flex items-center justify-center h-full p-12">
        <div class="text-center max-w-sm">
          <div class="relative mb-8">
            <div
              class="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner"
            >
              <font-awesome-icon
                :icon="['fas', 'inbox']"
                class="text-4xl text-gray-400 dark:text-gray-500"
              />
            </div>
            <div
              class="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg"
            >
              <font-awesome-icon :icon="['fas', 'clock']" class="text-white text-sm" />
            </div>
          </div>

          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">邮箱空空如也</h3>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            新邮件到达后，点击刷新即可在这里查看
          </p>

          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex items-center justify-center space-x-2">
              <font-awesome-icon :icon="['fas', 'bolt']" class="text-yellow-500" />
              <span>集中查看来信</span>
            </div>
            <div class="flex items-center justify-center space-x-2">
              <font-awesome-icon :icon="['fas', 'shield-alt']" class="text-green-500" />
              <span>自动识别验证码</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Email List -->
      <div v-else class="p-4 space-y-3">
        <article
          v-for="email in sortedEmails"
          :key="email.id"
          class="group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer"
          :class="{
            'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md': true,
            'ring-2 ring-primary-200 dark:ring-primary-800 bg-primary-50/30 dark:bg-primary-900/10':
              !readonly && !Boolean(email.is_read),
          }"
          @click="handleEmailClick(email)"
          @keydown.enter.prevent="handleEmailClick(email)"
          @keydown.space.prevent="handleEmailClick(email)"
          role="button"
          tabindex="0"
          :aria-label="`查看邮件：${email.subject || '无主题'}`"
        >
          <!-- 未读邮件的装饰条 -->
          <div
            v-if="!readonly && !Boolean(email.is_read)"
            class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary-500 to-primary-600 rounded-l-xl"
          ></div>

          <div class="flex items-start gap-3 sm:gap-4">
            <!-- Checkbox -->
            <div v-if="!readonly" class="flex-shrink-0 mt-1">
              <el-checkbox
                :model-value="selectedEmails.includes(email.id)"
                @change="(checked: boolean) => handleSelectEmail(email.id, checked)"
                @click.stop
                class="opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </div>

            <!-- Email Type Icon -->
            <div class="flex-shrink-0 mt-1">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                :class="{
                  'bg-gradient-to-br from-primary-500 to-primary-600 text-white':
                    ['shield-alt', 'user-plus'].includes(getEmailTypeIcon(email.subject || '', email.content || '').icon),
                  'bg-gradient-to-br from-orange-500 to-red-600 text-white':
                    getEmailTypeIcon(email.subject || '', email.content || '').icon === 'key',
                  'bg-gradient-to-br from-gray-400 to-gray-600 text-white':
                    getEmailTypeIcon(email.subject || '', email.content || '').icon === 'envelope',
                }"
              >
                <font-awesome-icon
                  :icon="['fas', getEmailTypeIcon(email.subject || '', email.content || '').icon]"
                  class="text-sm"
                />
              </div>
            </div>

            <!-- Email Content -->
            <div class="flex-1 min-w-0">
              <!-- Header -->
              <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div class="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ email.sender }}
                  </span>
                  <div v-if="!readonly" class="flex items-center space-x-2">
                    <span
                      v-if="!Boolean(email.is_read)"
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                    >
                      <div class="w-1.5 h-1.5 bg-primary-500 rounded-full mr-1 animate-pulse"></div>
                      新邮件
                    </span>
                    <span
                      v-else
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                    >
                      已读
                    </span>
                  </div>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-medium">
                  {{ formatDate(email.received_at) }}
                </span>
              </div>

              <!-- Subject -->
              <div class="mb-3">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {{ email.subject || '无主题' }}
                </h3>
              </div>

              <!-- Preview -->
              <div class="mb-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {{ truncateText(email.preview || email.content_preview || email.content || '') }}
                </p>
              </div>

              <!-- Verification Code -->
              <div v-if="email.verification_code" class="mb-4">
                <div
                  class="inline-flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-primary-100 to-primary-100 dark:from-primary-900/20 dark:to-primary-900/20 rounded-xl border border-green-200 dark:border-green-800"
                >
                  <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                      <font-awesome-icon :icon="['fas', 'key']" class="text-white text-xs" />
                    </div>
                    <span class="text-xs font-medium text-green-700 dark:text-green-300"
                      >验证码</span
                    >
                  </div>

                  <span
                    class="text-lg font-mono font-bold text-green-800 dark:text-green-200 tracking-wider"
                  >
                    {{ email.verification_code }}
                  </span>

                  <el-button
                    @click.stop="copyToClipboard(email.verification_code!)"
                    size="small"
                    circle
                    class="hover:bg-green-200 dark:hover:bg-green-800 shadow-sm"
                    title="复制验证码"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'copy']"
                      class="text-green-600 dark:text-green-400 text-xs"
                    />
                  </el-button>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <!-- 邮件类型标签 -->
                  <span
                    v-if="email.verification_code"
                    class="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs font-medium text-green-700 dark:text-green-300"
                  >
                    <font-awesome-icon :icon="['fas', 'shield-alt']" />
                    <span>验证邮件</span>
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400"
                  >
                    <font-awesome-icon :icon="['fas', 'envelope']" />
                    <span>普通邮件</span>
                  </span>
                </div>

                <div
                  class="flex items-center space-x-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                >
                  <el-button
                    @click.stop="handleEmailClick(email)"
                    size="small"
                    circle
                    class="hover:bg-primary-100 dark:hover:bg-primary-900/30 shadow-sm"
                    title="查看详情"
                  >
                    <font-awesome-icon :icon="['fas', 'eye']" class="text-primary-500 text-xs" />
                  </el-button>

                  <el-button
                    v-if="!readonly"
                    @click.stop="handleDeleteEmail(email.id)"
                    size="small"
                    circle
                    class="hover:bg-red-100 dark:hover:bg-red-900/20 shadow-sm"
                    title="删除邮件"
                  >
                    <font-awesome-icon :icon="['fas', 'trash']" class="text-red-500 text-xs" />
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <!-- Footer -->
      <div
        v-if="emails.length > 0"
        class="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-primary-50/30 dark:from-gray-800/50 dark:to-primary-900/10"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm"
            >
              <font-awesome-icon :icon="['fas', 'chart-bar']" class="text-white text-xs" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-gray-100">邮件统计</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                当前 {{ emails.length }} 封，共 {{ displayTotal }} 封
              </div>
            </div>
          </div>

          <el-pagination
            v-if="displayTotal > pageSize"
            small
            background
            layout="prev, pager, next"
            :current-page="page"
            :page-size="pageSize"
            :pager-count="5"
            :total="displayTotal"
            aria-label="邮件分页"
            @current-change="emit('pageChange', $event)"
          />

          <div v-if="!readonly" class="flex items-center space-x-4">
            <div
              class="flex items-center space-x-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 rounded-full"
            >
              <div class="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
              <span class="text-xs font-medium text-primary-700 dark:text-primary-300">
                {{ emails.filter((e) => !e.is_read).length }} 未读
              </span>
            </div>
            <div
              class="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
            >
              <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                {{ emails.filter((e) => e.is_read).length }} 已读
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Email Detail Dialog -->
  <EmailDetailDialog v-model="showDetailDialog" :email="selectedEmail" :loading="detailLoading" />
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
