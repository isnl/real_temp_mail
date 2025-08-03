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
    <div v-else-if="tempEmails.length === 0" class="flex items-center justify-center h-full p-12">
      <div class="text-center max-w-sm">
        <div class="relative mb-8">
          <div class="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center shadow-inner">
            <font-awesome-icon
              :icon="['fas', 'envelope-open']"
              class="text-4xl text-blue-500 dark:text-blue-400"
            />
          </div>
          <div class="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <font-awesome-icon :icon="['fas', 'plus']" class="text-white text-sm" />
          </div>
        </div>

        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          创建您的第一个临时邮箱
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          临时邮箱可以帮助您保护隐私，快速接收验证码和重要邮件
        </p>

        <div class="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <div class="flex items-center justify-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <font-awesome-icon :icon="['fas', 'bolt']" class="text-blue-500" />
            <span>实时接收邮件通知</span>
          </div>
          <div class="flex items-center justify-center space-x-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <font-awesome-icon :icon="['fas', 'magic']" class="text-purple-500" />
            <span>自动识别验证码</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Email List -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-3">
      <div
        v-for="tempEmail in tempEmails"
        :key="tempEmail.id"
        class="group relative p-4 rounded-xl transition-all duration-300 cursor-pointer border"
        :class="{
          'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-md transform scale-[1.02]':
            selectedTempEmail?.id === tempEmail.id,
          'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:transform hover:scale-[1.01]':
            selectedTempEmail?.id !== tempEmail.id
        }"
        @click="handleSelect(tempEmail)"
      >
        <!-- 选中状态的装饰条 -->
        <div
          v-if="selectedTempEmail?.id === tempEmail.id"
          class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-l-xl"
        ></div>

        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <!-- Email Address -->
            <div class="flex items-center space-x-3 mb-3">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                     :class="{
                       'bg-blue-500 text-white shadow-lg': selectedTempEmail?.id === tempEmail.id,
                       'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400': selectedTempEmail?.id !== tempEmail.id
                     }">
                  <font-awesome-icon :icon="['fas', 'at']" class="text-sm" />
                </div>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-semibold truncate"
                        :class="{
                          'text-blue-900 dark:text-blue-100': selectedTempEmail?.id === tempEmail.id,
                          'text-gray-900 dark:text-gray-100': selectedTempEmail?.id !== tempEmail.id
                        }">
                    {{ tempEmail.email }}
                  </span>

                  <!-- 复制按钮 -->
                  <el-button
                    @click.stop="copyToClipboard(tempEmail.email)"
                    size="small"
                    circle
                    class="flex-shrink-0"
                    :class="{
                      'hover:bg-blue-100 dark:hover:bg-blue-900/30': selectedTempEmail?.id === tempEmail.id,
                      'hover:bg-gray-200 dark:hover:bg-gray-600': selectedTempEmail?.id !== tempEmail.id
                    }"
                    title="复制邮箱地址"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'copy']"
                      class="text-xs"
                      :class="{
                        'text-blue-600 dark:text-blue-400': selectedTempEmail?.id === tempEmail.id,
                        'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300': selectedTempEmail?.id !== tempEmail.id
                      }"
                    />
                  </el-button>

                  <!-- 活跃状态指示器 -->
                  <div class="flex-shrink-0">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <!-- 创建时间 -->
                <div class="flex items-center space-x-1 mt-1">
                  <font-awesome-icon :icon="['fas', 'clock']" class="text-xs text-gray-400" />
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(tempEmail.created_at) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 操作按钮区域 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <!-- 状态标签 -->
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': selectedTempEmail?.id === tempEmail.id,
                        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': selectedTempEmail?.id !== tempEmail.id
                      }">
                  <font-awesome-icon :icon="['fas', 'circle']" class="mr-1 text-xs" />
                  活跃中
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div v-if="tempEmails.length > 0" class="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/10">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <font-awesome-icon :icon="['fas', 'list']" class="text-white text-xs" />
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              共 {{ tempEmails.length }} 个邮箱
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              全部处于活跃状态
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-medium text-green-700 dark:text-green-300">活跃</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
