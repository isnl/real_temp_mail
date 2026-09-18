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
      ...emailData.map((row) => Object.values(row).map(escapeCsvCell).join(',')),
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
</script>

<template>
  <div class="email-list">
    <div v-if="emails.length > 0 && !readonly" class="email-list-toolbar">
      <el-checkbox
        v-model="selectAll"
        @change="handleSelectAll"
        :indeterminate="selectedEmails.length > 0 && selectedEmails.length < emails.length"
        >全选</el-checkbox
      >
      <span class="email-selection-count">{{
        selectedEmails.length ? `已选 ${selectedEmails.length}` : `${emails.length} 封`
      }}</span>
      <div class="email-toolbar-actions">
        <el-button
          v-if="selectedEmails.length > 0"
          type="danger"
          plain
          @click="handleBatchDelete"
          :disabled="loading"
          >删除 {{ selectedEmails.length }}</el-button
        >
        <el-button @click="exportEmails" :disabled="loading"
          ><font-awesome-icon icon="download" class="mr-1" />导出</el-button
        >
      </div>
    </div>
    <div class="email-list-scroll">
      <div v-if="loading" class="p-5"><el-skeleton :rows="4" animated /></div>
      <div v-else-if="emails.length === 0" class="mailbox-empty">
        <font-awesome-icon icon="envelope-open" />
        <h3>暂时没有来信</h3>
        <p>新邮件到达后，刷新即可查看。</p>
      </div>
      <div v-else>
        <article
          v-for="email in sortedEmails"
          :key="email.id"
          class="message-row"
          :class="{ 'is-unread': !readonly && !Boolean(email.is_read) }"
        >
          <div class="message-main">
            <el-checkbox
              v-if="!readonly"
              :model-value="selectedEmails.includes(email.id)"
              :aria-label="`选择邮件：${email.subject || '无主题'}`"
              @change="(checked: boolean) => handleSelectEmail(email.id, checked)"
            />
            <button
              type="button"
              class="message-open"
              :aria-label="`查看邮件：${email.subject || '无主题'}`"
              @click="handleEmailClick(email)"
            >
              <span class="message-meta"
                ><span class="message-sender" :title="email.sender">{{ email.sender }}</span
                ><time>{{ formatDate(email.received_at) }}</time></span
              >
              <strong class="message-subject">{{ email.subject || '无主题' }}</strong>
              <span class="message-preview">{{
                truncateText(email.preview || email.content_preview || email.content || '')
              }}</span>
            </button>
          </div>
          <div class="message-extras">
            <div v-if="email.verification_code" class="message-code">
              <span>验证码</span><strong>{{ email.verification_code }}</strong>
              <button
                type="button"
                class="mailbox-icon-button"
                aria-label="复制验证码"
                @click="copyToClipboard(email.verification_code!)"
              >
                <font-awesome-icon icon="copy" />
              </button>
            </div>
            <span v-if="!readonly" class="message-read-status">{{
              Boolean(email.is_read) ? '已读' : '未读'
            }}</span>
            <button
              v-if="!readonly"
              type="button"
              class="mailbox-icon-button message-delete"
              :aria-label="`删除邮件：${email.subject || '无主题'}`"
              @click="handleDeleteEmail(email.id)"
            >
              <font-awesome-icon icon="trash" />
            </button>
          </div>
        </article>
      </div>
      <footer v-if="emails.length > 0" class="email-list-footer">
        <span>当前 {{ emails.length }} 封，共 {{ displayTotal }} 封</span>
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
      </footer>
    </div>
  </div>
  <EmailDetailDialog v-model="showDetailDialog" :email="selectedEmail" :loading="detailLoading" />
</template>

<style scoped>
.email-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.email-list-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}
.email-selection-count {
  color: var(--text-tertiary);
  font-size: 12px;
}
.email-toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}
.email-toolbar-actions :deep(.el-button) {
  margin: 0;
}
.email-list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.message-row {
  min-width: 0;
  padding: 16px 20px 10px;
  border-bottom: 1px solid var(--border);
}
.message-row:hover {
  background: var(--surface-muted);
}
.message-row.is-unread {
  background: color-mix(in srgb, var(--brand-soft) 38%, var(--surface));
}
.message-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.message-main > :deep(.el-checkbox) {
  flex-shrink: 0;
  height: 32px;
}
.message-open {
  display: grid;
  gap: 7px;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  text-align: left;
}
.message-meta {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: 0;
}
.message-sender {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-secondary);
}
.message-meta time {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 11px;
}
.message-subject {
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.message-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.message-extras {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}
.message-code {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding-left: 10px;
  border-radius: 7px;
  background: var(--brand-soft);
  color: var(--brand-link);
}
.message-code > span {
  font-size: 11px;
  white-space: nowrap;
}
.message-code strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: ui-monospace, monospace;
  font-size: 16px;
  letter-spacing: 0.04em;
}
.message-read-status {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 11px;
}
.message-delete {
  color: var(--text-tertiary);
}
.message-delete:hover {
  color: var(--danger);
}
.email-list-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  color: var(--text-tertiary);
  font-size: 12px;
}
@media (max-width: 1100px) {
  .email-list {
    height: auto;
  }
  .mailbox-messages .email-list-scroll {
    overflow: visible;
  }
}
@media (max-width: 600px) {
  .email-list-toolbar {
    padding: 8px 12px;
  }
  .message-row {
    padding: 14px 12px 8px;
  }
  .message-main {
    gap: 8px;
  }
  .message-meta {
    flex-wrap: wrap;
    gap: 3px 8px;
  }
  .message-sender {
    flex-basis: 100%;
  }
  .email-list-footer {
    padding: 14px 12px;
  }
}
</style>
