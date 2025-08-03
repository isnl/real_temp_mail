<script lang="ts" setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useEmailStore } from '@/stores/email'
import type { Email } from '@/types'
import EmailDetailDialog from './EmailDetailDialog.vue'

interface Props {
  tempEmailId: number
  emails: Email[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emailStore = useEmailStore()

const selectedEmail = ref<Email | null>(null)
const showDetailDialog = ref(false)
const selectedEmails = ref<number[]>([])
const selectAll = ref(false)

const sortedEmails = computed(() => {
  return [...props.emails].sort((a, b) => 
    new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
  )
})

const handleEmailClick = (email: Email) => {
  selectedEmail.value = email
  showDetailDialog.value = true
}

const handleDeleteEmail = async (emailId: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这封邮件吗？删除后无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await emailStore.deleteEmail(emailId)
    ElMessage.success('邮件删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete email error:', error)
      ElMessage.error('删除失败')
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

// 导出邮件功能
const exportEmails = () => {
  if (props.emails.length === 0) {
    ElMessage.warning('没有邮件可以导出')
    return
  }

  try {
    const emailData = props.emails.map(email => ({
      发件人: email.sender,
      主题: email.subject || '无主题',
      内容: email.content || '无内容',
      验证码: email.verification_code || '无',
      接收时间: new Date(email.received_at).toLocaleString('zh-CN'),
      是否已读: email.is_read ? '是' : '否'
    }))

    const csvContent = [
      Object.keys(emailData[0]).join(','),
      ...emailData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `emails_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('邮件导出成功')
  } catch (error) {
    console.error('Export failed:', error)
    ElMessage.error('导出失败')
  }
}

// 批量操作功能
const handleSelectAll = () => {
  if (selectAll.value) {
    selectedEmails.value = props.emails.map(email => email.id)
  } else {
    selectedEmails.value = []
  }
}

const handleSelectEmail = (emailId: number, checked: boolean) => {
  if (checked) {
    selectedEmails.value.push(emailId)
  } else {
    selectedEmails.value = selectedEmails.value.filter(id => id !== emailId)
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
        type: 'warning'
      }
    )

    // 逐个删除邮件
    for (const emailId of selectedEmails.value) {
      await emailStore.deleteEmail(emailId)
    }

    selectedEmails.value = []
    selectAll.value = false
    ElMessage.success('批量删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Batch delete error:', error)
      ElMessage.error('批量删除失败')
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
      minute: '2-digit'
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

  if (lowerSubject.includes('verification') || 
      lowerSubject.includes('验证') ||
      lowerContent.includes('verification code') ||
      lowerContent.includes('验证码')) {
    return { icon: 'shield-alt', color: 'text-green-500' }
  }

  if (lowerSubject.includes('reset') || 
      lowerSubject.includes('password') ||
      lowerSubject.includes('重置') ||
      lowerSubject.includes('密码')) {
    return { icon: 'key', color: 'text-orange-500' }
  }

  if (lowerSubject.includes('welcome') || 
      lowerSubject.includes('confirm') ||
      lowerSubject.includes('欢迎') ||
      lowerSubject.includes('确认')) {
    return { icon: 'user-plus', color: 'text-blue-500' }
  }

  return { icon: 'envelope', color: 'text-gray-500' }
}
</script>

<template>
  <div class="flex flex-col h-96">
    <!-- Toolbar -->
    <div v-if="emails.length > 0" class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center space-x-4">
        <el-checkbox
          v-model="selectAll"
          @change="handleSelectAll"
          :indeterminate="selectedEmails.length > 0 && selectedEmails.length < emails.length"
        >
          全选
        </el-checkbox>
        <div class="text-sm text-gray-600 dark:text-gray-400">
          <span v-if="selectedEmails.length > 0">
            已选择 {{ selectedEmails.length }} 封邮件
          </span>
          <span v-else>
            共 {{ emails.length }} 封邮件
          </span>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <el-button
          v-if="selectedEmails.length > 0"
          size="small"
          type="danger"
          @click="handleBatchDelete"
          :disabled="loading"
        >
          <font-awesome-icon icon="trash" class="mr-1" />
          批量删除
        </el-button>
        <el-button
          size="small"
          @click="exportEmails"
          :disabled="loading"
        >
          <font-awesome-icon icon="download" class="mr-1" />
          导出邮件
        </el-button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div v-if="loading" class="p-6">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- Empty State -->
      <div v-else-if="emails.length === 0" class="p-12 text-center">
        <font-awesome-icon
          :icon="['fas', 'inbox']"
          class="text-6xl text-gray-300 dark:text-gray-600 mb-4"
        />
        <p class="text-gray-500 dark:text-gray-400 mb-2">
          暂无邮件
        </p>
        <p class="text-sm text-gray-400 dark:text-gray-500">
          邮件将会自动显示在这里
        </p>
      </div>

      <!-- Email List -->
      <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
      <div
        v-for="email in sortedEmails"
        :key="email.id"
        class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        @click="handleEmailClick(email)"
      >
        <div class="flex items-start space-x-3">
          <!-- Checkbox -->
          <div class="flex-shrink-0 mt-1">
            <el-checkbox
              :model-value="selectedEmails.includes(email.id)"
              @change="(checked: boolean) => handleSelectEmail(email.id, checked)"
              @click.stop
            />
          </div>

          <!-- Email Type Icon -->
          <div class="flex-shrink-0 mt-1">
            <div class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <font-awesome-icon
                :icon="['fas', getEmailTypeIcon(email.subject, email.content).icon]"
                :class="getEmailTypeIcon(email.subject, email.content).color"
                class="text-sm"
              />
            </div>
          </div>

          <!-- Email Content -->
          <div class="flex-1 min-w-0">
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ email.sender }}
                </span>
                <span v-if="!email.is_read" class="w-2 h-2 bg-blue-500 rounded-full"></span>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {{ formatDate(email.received_at) }}
              </span>
            </div>

            <!-- Subject -->
            <div class="mb-2">
              <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ email.subject || '无主题' }}
              </h3>
            </div>

            <!-- Preview -->
            <div class="mb-2">
              <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ truncateText(email.content || '') }}
              </p>
            </div>

            <!-- Verification Code -->
            <div v-if="email.verification_code" class="mb-2">
              <div class="inline-flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <font-awesome-icon 
                  :icon="['fas', 'key']" 
                  class="text-green-600 dark:text-green-400 text-xs"
                />
                <span class="text-sm font-mono font-bold text-green-700 dark:text-green-300">
                  {{ email.verification_code }}
                </span>
                <button
                  @click.stop="copyToClipboard(email.verification_code!)"
                  class="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  title="复制验证码"
                >
                  <font-awesome-icon 
                    :icon="['fas', 'copy']" 
                    class="text-green-600 dark:text-green-400 text-xs"
                  />
                </button>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="email.verification_code" class="flex items-center space-x-1">
                  <font-awesome-icon :icon="['fas', 'shield-alt']" />
                  <span>验证码</span>
                </span>
                <span class="flex items-center space-x-1">
                  <font-awesome-icon :icon="['fas', 'eye']" />
                  <span>{{ email.is_read ? '已读' : '未读' }}</span>
                </span>
              </div>

              <div class="flex items-center space-x-2">
                <button
                  @click.stop="handleEmailClick(email)"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="查看详情"
                >
                  <font-awesome-icon 
                    :icon="['fas', 'eye']" 
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                  />
                </button>
                
                <button
                  @click.stop="handleDeleteEmail(email.id)"
                  class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  title="删除邮件"
                >
                  <font-awesome-icon 
                    :icon="['fas', 'trash']" 
                    class="text-gray-400 hover:text-red-500 text-xs"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div v-if="emails.length > 0" class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>共 {{ emails.length }} 封邮件</span>
        <div class="flex items-center space-x-4">
          <span class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>未读</span>
          </span>
          <span class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>已读</span>
          </span>
        </div>
        </div>
      </div>
    </div>

    <!-- Email Detail Dialog -->
    <EmailDetailDialog
      v-model="showDetailDialog"
      :email="selectedEmail"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
