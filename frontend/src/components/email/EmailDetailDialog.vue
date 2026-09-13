<script lang="ts" setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { EmailMessage } from '@/types'
import { buildSandboxedEmailHtml } from '@/utils/safeEmailHtml'

interface Props {
  modelValue: boolean
  email: EmailMessage | null
  loading?: boolean
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

const sandboxedHtml = computed(() => buildSandboxedEmailHtml(props.email?.html_content))

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

// 转发邮件功能
const forwardEmail = () => {
  if (!props.email) return

  const subject = `转发: ${props.email.subject || '无主题'}`
  const body = `
---------- 转发邮件 ----------
发件人: ${props.email.sender}
主题: ${props.email.subject || '无主题'}
时间: ${formatDate(props.email.received_at)}

${props.email.content || '无内容'}
`

  const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoLink)
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
    append-to-body
  >
    <el-skeleton v-if="props.loading" :rows="8" animated />
    <div v-else-if="props.email" class="flex flex-col gap-6">
      <!-- Email Header -->
      <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {{ props.email.subject || '无主题' }}
            </h3>
            <div class="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div class="flex items-center space-x-2">
                <span class="font-medium">发件人:</span>
                <span>{{ props.email.sender }}</span>
                <el-button
                  @click="copyToClipboard(props.email.sender)"
                  size="small"
                  circle
                  class="hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="复制发件人地址"
                >
                  <font-awesome-icon
                    :icon="['fas', 'copy']"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xs"
                  />
                </el-button>
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
                <el-button
                  @click="copyToClipboard(props.email.verification_code!)"
                  size="small"
                  circle
                  class="hover:bg-green-200 dark:hover:bg-green-800"
                  title="复制验证码"
                >
                  <font-awesome-icon
                    :icon="['fas', 'copy']"
                    class="text-green-600 dark:text-green-400"
                  />
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Content -->
      <div class="flex flex-col gap-4">
        <!-- Text Content -->
        <div v-if="props.email.content" class="flex flex-col gap-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">
            邮件内容
          </h4>
          <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <pre class="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">{{ props.email.content }}</pre>
          </div>
          <div class="flex justify-end">
            <el-button
              @click="copyToClipboard(props.email.content!)"
              type="primary"
              link
              size="small"
            >
              <font-awesome-icon :icon="['fas', 'copy']" class="mr-1" />
              复制内容
            </el-button>
          </div>
        </div>

        <!-- HTML Content -->
        <div v-if="props.email.html_content" class="flex flex-col gap-2">
          <h4 class="font-medium text-gray-900 dark:text-gray-100">
            HTML 内容
          </h4>
          <div class="email-html-frame-wrap">
            <iframe
              class="email-html-frame"
              :srcdoc="sandboxedHtml"
              sandbox=""
              referrerpolicy="no-referrer"
              title="隔离的邮件 HTML 内容"
            />
          </div>
          <div class="flex justify-end">
            <el-button
              @click="copyToClipboard(props.email.html_content!)"
              type="primary"
              link
              size="small"
            >
              <font-awesome-icon :icon="['fas', 'copy']" class="mr-1" />
              复制HTML
            </el-button>
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
      <div class="flex justify-between">
        <el-button @click="forwardEmail">
          <font-awesome-icon icon="share" class="mr-1" />
          转发邮件
        </el-button>
        <el-button @click="visible = false">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.email-html-frame-wrap {
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: #fff;
}

.email-html-frame {
  display: block;
  width: 100%;
  height: min(48vh, 420px);
  min-height: 280px;
  border: 0;
  background: #fff;
}
</style>
