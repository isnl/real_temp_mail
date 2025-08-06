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
  if (!props.emails || !Array.isArray(props.emails)) {
    return []
  }
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
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div v-if="emails.length > 0" class="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-green-50/30 dark:from-gray-800/50 dark:to-green-900/10">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-3">
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
              <div class="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-xs" />
              </div>
              <div class="text-sm">
                <span v-if="selectedEmails.length > 0" class="font-semibold text-green-700 dark:text-green-300">
                  已选择 {{ selectedEmails.length }} 封邮件
                </span>
                <span v-else class="font-medium text-gray-700 dark:text-gray-300">
                  共 {{ emails.length }} 封邮件
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
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

          <el-button
            size="default"
            @click="exportEmails"
            :disabled="loading"
            class="shadow-sm"
          >
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
            <div class="w-32 h-32 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center shadow-inner">
              <font-awesome-icon
                :icon="['fas', 'inbox']"
                class="text-4xl text-gray-400 dark:text-gray-500"
              />
            </div>
            <div class="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <font-awesome-icon :icon="['fas', 'clock']" class="text-white text-sm" />
            </div>
          </div>

          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            邮箱空空如也
          </h3>
          <p class="text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            当有新邮件到达时，它们会自动显示在这里
          </p>

          <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div class="flex items-center justify-center space-x-2">
              <font-awesome-icon :icon="['fas', 'bolt']" class="text-yellow-500" />
              <span>实时接收邮件</span>
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
        <div
          v-for="email in sortedEmails"
          :key="email.id"
          class="group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer"
          :class="{
            'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:transform hover:scale-[1.01]': true,
            'ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50/30 dark:bg-blue-900/10': !email.is_read
          }"
          @click="handleEmailClick(email)"
        >
          <!-- 未读邮件的装饰条 -->
          <div
            v-if="!email.is_read"
            class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl"
          ></div>

          <div class="flex items-start space-x-4">
            <!-- Checkbox -->
            <div class="flex-shrink-0 mt-1">
              <el-checkbox
                :model-value="selectedEmails.includes(email.id)"
                @change="(checked: boolean) => handleSelectEmail(email.id, checked)"
                @click.stop
                class="opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </div>

            <!-- Email Type Icon -->
            <div class="flex-shrink-0 mt-1">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                   :class="{
                     'bg-gradient-to-br from-green-500 to-emerald-600 text-white': getEmailTypeIcon(email.subject || '', email.content || '').icon === 'shield-alt',
                     'bg-gradient-to-br from-orange-500 to-red-600 text-white': getEmailTypeIcon(email.subject || '', email.content || '').icon === 'key',
                     'bg-gradient-to-br from-blue-500 to-indigo-600 text-white': getEmailTypeIcon(email.subject || '', email.content || '').icon === 'user-plus',
                     'bg-gradient-to-br from-gray-400 to-gray-600 text-white': getEmailTypeIcon(email.subject || '', email.content || '').icon === 'envelope'
                   }">
                <font-awesome-icon
                  :icon="['fas', getEmailTypeIcon(email.subject || '', email.content || '').icon]"
                  class="text-sm"
                />
              </div>
            </div>

            <!-- Email Content -->
            <div class="flex-1 min-w-0">
              <!-- Header -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {{ email.sender }}
                  </span>
                  <div class="flex items-center space-x-2">
                    <span v-if="!email.is_read" class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <div class="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                      新邮件
                    </span>
                    <span v-else class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
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
                  {{ truncateText(email.content || '') }}
                </p>
              </div>

              <!-- Verification Code -->
              <div v-if="email.verification_code" class="mb-4">
                <div class="inline-flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                      <font-awesome-icon :icon="['fas', 'key']" class="text-white text-xs" />
                    </div>
                    <span class="text-xs font-medium text-green-700 dark:text-green-300">验证码</span>
                  </div>

                  <span class="text-lg font-mono font-bold text-green-800 dark:text-green-200 tracking-wider">
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
                  <span v-if="email.verification_code" class="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs font-medium text-green-700 dark:text-green-300">
                    <font-awesome-icon :icon="['fas', 'shield-alt']" />
                    <span>验证邮件</span>
                  </span>
                  <span v-else class="inline-flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-600 dark:text-gray-400">
                    <font-awesome-icon :icon="['fas', 'envelope']" />
                    <span>普通邮件</span>
                  </span>
                </div>

                <div class="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <el-button
                    @click.stop="handleEmailClick(email)"
                    size="small"
                    circle
                    class="hover:bg-blue-100 dark:hover:bg-blue-900/30 shadow-sm"
                    title="查看详情"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'eye']"
                      class="text-blue-500 text-xs"
                    />
                  </el-button>

                  <el-button
                    @click.stop="handleDeleteEmail(email.id)"
                    size="small"
                    circle
                    class="hover:bg-red-100 dark:hover:bg-red-900/20 shadow-sm"
                    title="删除邮件"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'trash']"
                      class="text-red-500 text-xs"
                    />
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Footer -->
    <div v-if="emails.length > 0" class="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-green-50/30 dark:from-gray-800/50 dark:to-green-900/10">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <font-awesome-icon :icon="['fas', 'chart-bar']" class="text-white text-xs" />
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              邮件统计
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              共 {{ emails.length }} 封邮件
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-blue-700 dark:text-blue-300">
              {{ emails.filter(e => !e.is_read).length }} 未读
            </span>
          </div>
          <div class="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
              {{ emails.filter(e => e.is_read).length }} 已读
            </span>
          </div>
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
