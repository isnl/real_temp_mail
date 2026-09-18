<script lang="ts" setup>
import { computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import type { TempEmail } from '@/types'

interface Props {
  loading?: boolean
  deletingId?: number | null
}

interface Emits {
  (e: 'select', tempEmail: TempEmail): void
  (e: 'togglePublicInbox', tempEmail: TempEmail, enabled: boolean): void
  (e: 'delete', tempEmail: TempEmail): void
}

withDefaults(defineProps<Props>(), {
  loading: false,
  deletingId: null,
})

const emit = defineEmits<Emits>()

const emailStore = useEmailStore()

const tempEmails = computed(() => emailStore.activeTempEmails)
const selectedTempEmail = computed(() => emailStore.selectedTempEmail)

const handleSelect = (tempEmail: TempEmail) => {
  emailStore.setSelectedTempEmail(tempEmail)
  emit('select', tempEmail)
}

const getPublicInboxUrl = (email: string) => {
  return `${window.location.origin}/public-inbox?email=${encodeURIComponent(email)}`
}

const handleTogglePublicInbox = (tempEmail: TempEmail, enabled: boolean) => {
  emit('togglePublicInbox', tempEmail, enabled)
}

const copyPublicInboxUrl = async (email: string) => {
  await copyToClipboard(getPublicInboxUrl(email))
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}
</script>

<template>
  <div class="temp-email-list">
    <div v-if="loading" class="p-5"><el-skeleton :rows="4" animated /></div>
    <div v-else-if="tempEmails.length === 0" class="mailbox-empty">
      <font-awesome-icon icon="inbox" />
      <h3>还没有临时邮箱</h3>
      <p>选择域名创建邮箱，即可开始收信。</p>
    </div>
    <div v-else class="mailbox-items">
      <article
        v-for="tempEmail in tempEmails"
        :key="tempEmail.id"
        class="mailbox-item"
        :class="{ 'is-selected': selectedTempEmail?.id === tempEmail.id }"
      >
        <button
          type="button"
          class="mailbox-select"
          :aria-pressed="selectedTempEmail?.id === tempEmail.id"
          :aria-label="`选择邮箱 ${tempEmail.email}`"
          @click="handleSelect(tempEmail)"
        >
          <span class="mailbox-address-icon"><font-awesome-icon icon="at" /></span>
          <span class="mailbox-address-copy">
            <strong :title="tempEmail.email">{{ tempEmail.email }}</strong>
            <small
              >{{ formatDate(tempEmail.created_at)
              }}<span v-if="tempEmail.public_inbox_enabled"> · 公开收件箱</span></small
            >
          </span>
        </button>
        <el-dropdown trigger="click" placement="bottom-end" popper-class="mailbox-actions-menu">
          <button
            type="button"
            class="mailbox-icon-button"
            :aria-label="`邮箱操作：${tempEmail.email}`"
          >
            <font-awesome-icon icon="ellipsis" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="copyToClipboard(tempEmail.email)"
                >复制邮箱地址</el-dropdown-item
              >
              <el-dropdown-item
                @click="handleTogglePublicInbox(tempEmail, !tempEmail.public_inbox_enabled)"
                >{{
                  tempEmail.public_inbox_enabled ? '关闭公开收件箱' : '开启公开收件箱'
                }}</el-dropdown-item
              >
              <el-dropdown-item
                v-if="tempEmail.public_inbox_enabled"
                @click="copyPublicInboxUrl(tempEmail.email)"
                >复制公开收件箱链接</el-dropdown-item
              >
              <el-dropdown-item
                divided
                class="mailbox-delete-action"
                :disabled="deletingId !== null"
                @click="emit('delete', tempEmail)"
                >{{ deletingId === tempEmail.id ? '删除中…' : '删除邮箱' }}</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </article>
    </div>
  </div>
</template>

<style scoped>
.temp-email-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.mailbox-items {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.mailbox-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.mailbox-item:hover {
  background: var(--surface-muted);
}
.mailbox-item.is-selected {
  background: var(--brand-soft);
}
.mailbox-select {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  text-align: left;
  color: var(--text-primary);
  background: transparent;
}
.mailbox-address-icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 19px;
}
.is-selected .mailbox-address-icon {
  color: var(--brand-link);
}
.mailbox-address-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}
.mailbox-address-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
}
.mailbox-address-copy small {
  color: var(--text-tertiary);
  font-size: 11px;
}
@media (max-width: 1100px) {
  .temp-email-list {
    height: auto;
  }
  .mailbox-items {
    overflow: visible;
  }
}
@media (max-width: 600px) {
  .mailbox-item {
    padding: 10px 12px;
    gap: 4px;
  }
  .mailbox-select {
    gap: 6px;
  }
  .mailbox-address-icon {
    width: 24px;
    font-size: 17px;
  }
}
</style>
