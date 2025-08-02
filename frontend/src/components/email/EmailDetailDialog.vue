<script lang="ts" setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Email } from '@/types'

interface Props {
  modelValue: boolean
  email: Email | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    console.error('Copy failed:', error)
    ElMessage.error('复制失败')
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const handleClose = () => {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="props.email?.subject || '邮件详情'"
    width="800px"
    @close="handleClose"
  >
    <div v-if="props.email" class="space-y-6">
      <!-- Email Header -->
      <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {{ props.email.subject || '无主题' }}
            </h3>
            <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center space-x-2">
                <span class="font-medium">发件人:</span>
                <span>{{ props.email.sender }}</span>
                <button
                  @click="copyToClipboard(props.email.sender)"
                  class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="复制发件人地址"
                >
                  <font-awesome-icon 
                    :icon="['fas', 'copy']" 
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                  />
                </button>
              </div>
              <div class="flex items-center space-x-2">
                <span class="font-medium">接收时间:</span>
                <span>{{ formatDate(props.email.received_at) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Verification Code -->
          <div v-if="props.email.verification_code" class="ml-4">
            <div class="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <font-awesome-icon 
                  :icon="['fas', 'key']" 
                  class="text-green-600 dark:text-green-400"
                />
                <span class="text-sm font-medium text-green-700 dark:text-green-300">
                  验证码
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <span class="text-lg font-mono font-bold text-green-700 dark:text-green-300">
                  {{ props.email.verification_code }}
                </span>
                <button
                  @click="copyToClipboard(props.email.verification_code!)"
                  class="p-2 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  title="复制验证码"
                >
                  <font-awesome-icon 
                    :icon="['fas', 'copy']" 
                    class="text-green-600 dark:text-green-400"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Content -->
      <div class="space-y-4">
        <!-- Text Content -->
        <div v-if="props.email.content" class="space-y-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">
            邮件内容
          </h4>
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">{{ props.email.content }}</pre>
          </div>
          <div class="flex justify-end">
            <button
              @click="copyToClipboard(props.email.content!)"
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <font-awesome-icon :icon="['fas', 'copy']" class="mr-1" />
              复制内容
            </button>
          </div>
        </div>

        <!-- HTML Content -->
        <div v-if="props.email.html_content" class="space-y-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">
            HTML 内容
          </h4>
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div v-html="props.email.html_content" class="prose dark:prose-invert max-w-none"></div>
          </div>
          <div class="flex justify-end">
            <button
              @click="copyToClipboard(props.email.html_content!)"
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <font-awesome-icon :icon="['fas', 'copy']" class="mr-1" />
              复制HTML
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!props.email.content && !props.email.html_content" class="text-center py-8">
          <font-awesome-icon 
            :icon="['fas', 'inbox']" 
            class="text-4xl text-gray-300 dark:text-gray-600 mb-2"
          />
          <p class="text-gray-500 dark:text-gray-400">
            此邮件没有内容
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <el-button @click="handleClose">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 限制HTML内容中的样式 */
:deep(.prose) {
  max-width: none;
}

:deep(.prose img) {
  max-width: 100%;
  height: auto;
}

:deep(.prose a) {
  color: #3b82f6;
  text-decoration: underline;
}

:deep(.prose table) {
  width: 100%;
  border-collapse: collapse;
}

:deep(.prose th),
:deep(.prose td) {
  border: 1px solid #e5e7eb;
  padding: 8px;
}
</style>
