<script lang="ts" setup>
import { computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import type { TempEmail } from '@/types'

interface Props {
  loading?: boolean
}

interface Emits {
  (e: 'select', tempEmail: TempEmail): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const emailStore = useEmailStore()

const tempEmails = computed(() => emailStore.activeTempEmails)
const selectedTempEmail = computed(() => emailStore.selectedTempEmail)

const handleSelect = (tempEmail: TempEmail) => {
  emailStore.setSelectedTempEmail(tempEmail)
  emit('select', tempEmail)
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
  <div class="h-full px-10px pb-10px overflow-hidden flex flex-col">
    <!-- Loading State -->
    <div v-if="loading" class="p-6 text-center">
      <el-skeleton :rows="3" animated />
    </div>

    <!-- Empty State -->
    <div v-else-if="tempEmails.length === 0" class="p-12 text-center">
      <div class="relative mb-6">
        <div class="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
          <font-awesome-icon
            :icon="['fas', 'envelope-open']"
            class="text-3xl text-blue-500 dark:text-blue-400"
          />
        </div>
      </div>

      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        开始创建您的第一个临时邮箱
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        临时邮箱可以帮助您保护隐私，快速接收验证码
      </p>

      <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center justify-center space-x-2">
          <font-awesome-icon :icon="['fas', 'shield-alt']" class="text-green-500" />
          <span>保护您的真实邮箱地址</span>
        </div>
        <div class="flex items-center justify-center space-x-2">
          <font-awesome-icon :icon="['fas', 'clock']" class="text-blue-500" />
          <span>实时接收邮件通知</span>
        </div>
      </div>
    </div>

    <!-- Email List -->
    <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
      <div
        v-for="tempEmail in tempEmails"
        :key="tempEmail.id"
        class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        :class="{
          'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500': 
            selectedTempEmail?.id === tempEmail.id
        }"
        @click="handleSelect(tempEmail)"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <!-- Email Address -->
            <div class="flex items-center space-x-2 mb-2">
              <font-awesome-icon 
                :icon="['fas', 'envelope']" 
                class="text-blue-500 dark:text-blue-400 text-sm"
              />
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ tempEmail.email }}
              </span>
              <el-button
                @click.stop="copyToClipboard(tempEmail.email)"
                size="small"
                circle
                class="hover:bg-gray-200 dark:hover:bg-gray-600"
                title="复制邮箱地址"
              >
                <font-awesome-icon
                  :icon="['fas', 'copy']"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                />
              </el-button>
            </div>

            <!-- Meta Info -->
            <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span class="flex items-center space-x-1">
                <font-awesome-icon :icon="['fas', 'clock']" />
                <span>{{ formatDate(tempEmail.created_at) }}</span>
              </span>
              
              <span class="flex items-center space-x-1">
                <font-awesome-icon class="text-green-500" :icon="['fas', 'circle']" />
                <span>活跃</span>
              </span>
            </div>
          </div>
        </div>

        <!-- Selection Indicator -->
        <div 
          v-if="selectedTempEmail?.id === tempEmail.id"
          class="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800"
        >
          <div class="flex items-center space-x-2 text-xs text-blue-600 dark:text-blue-400">
            <font-awesome-icon :icon="['fas', 'check-circle']" />
            <span>已选中 - 查看右侧邮件列表</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div v-if="tempEmails.length > 0" class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>共 {{ tempEmails.length }} 个临时邮箱</span>
        <div class="flex items-center space-x-4">
          <span class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>活跃</span>
          </span>
          <span class="flex items-center space-x-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>已停用</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
