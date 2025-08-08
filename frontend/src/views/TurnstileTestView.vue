<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

const turnstile = useTurnstile()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()

// 处理 Turnstile 验证成功
const handleTurnstileSuccess = (token: string) => {
  turnstile.handleSuccess(token)
  ElMessage.success('人机验证成功！')
  console.log('Turnstile Token:', token)
}

// 处理 Turnstile 验证失败
const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
  ElMessage.error(`人机验证失败: ${error}`)
}

// 重置验证
const resetTurnstile = () => {
  turnstileRef.value?.reset()
  turnstile.reset()
  ElMessage.info('已重置人机验证')
}

// 获取当前 token
const getToken = () => {
  const token = turnstileRef.value?.getResponse()
  if (token) {
    ElMessage.success(`当前 Token: ${token.substring(0, 20)}...`)
    console.log('Current Token:', token)
  } else {
    ElMessage.warning('暂无有效 Token')
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Turnstile 人机验证测试
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          测试 Cloudflare Turnstile 人机验证组件的功能
        </p>
      </div>

      <!-- Test Card -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-8">
        <!-- Status Display -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            验证状态
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="text-sm text-gray-600 dark:text-gray-400">验证状态</div>
              <div class="text-lg font-medium" :class="{
                'text-green-600 dark:text-green-400': turnstile.isVerified.value,
                'text-red-600 dark:text-red-400': !turnstile.isVerified.value
              }">
                {{ turnstile.isVerified.value ? '已验证' : '未验证' }}
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="text-sm text-gray-600 dark:text-gray-400">加载状态</div>
              <div class="text-lg font-medium" :class="{
                'text-blue-600 dark:text-blue-400': turnstile.isLoading.value,
                'text-gray-600 dark:text-gray-400': !turnstile.isLoading.value
              }">
                {{ turnstile.isLoading.value ? '加载中' : '已就绪' }}
              </div>
            </div>
          </div>
          
          <!-- Error Display -->
          <div v-if="turnstile.error.value" class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="text-red-800 dark:text-red-200">
              <strong>错误:</strong> {{ turnstile.error.value }}
            </div>
          </div>

          <!-- Token Display -->
          <div v-if="turnstile.turnstileToken.value" class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div class="text-green-800 dark:text-green-200">
              <strong>Token:</strong> {{ turnstile.turnstileToken.value.substring(0, 50) }}...
            </div>
          </div>
        </div>

        <!-- Turnstile Widget -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            人机验证组件
          </h3>
          <div class="flex justify-center">
            <TurnstileWidget
              ref="turnstileRef"
              :site-key="turnstile.siteKey"
              :theme="turnstile.theme.value"
              @success="handleTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="turnstile.handleExpired"
              @timeout="turnstile.handleTimeout"
              @before-interactive="turnstile.handleBeforeInteractive"
              @after-interactive="turnstile.handleAfterInteractive"
              @unsupported="turnstile.handleUnsupported"
            />
          </div>
        </div>

        <!-- Control Buttons -->
        <div class="flex flex-wrap gap-4 justify-center">
          <el-button @click="resetTurnstile" type="warning">
            重置验证
          </el-button>
          <el-button @click="getToken" type="info">
            获取 Token
          </el-button>
          <el-button 
            @click="() => ElMessage.info(`Site Key: ${turnstile.siteKey}`)" 
            type="default"
          >
            显示 Site Key
          </el-button>
        </div>

        <!-- Configuration Info -->
        <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            配置信息
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600 dark:text-gray-400">Site Key:</span>
              <span class="ml-2 font-mono text-gray-900 dark:text-gray-100">
                {{ turnstile.siteKey }}
              </span>
            </div>
            <div>
              <span class="text-gray-600 dark:text-gray-400">主题:</span>
              <span class="ml-2 font-mono text-gray-900 dark:text-gray-100">
                {{ turnstile.theme.value }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Back Button -->
      <div class="text-center mt-8">
        <router-link to="/dashboard">
          <el-button type="primary">
            返回仪表板
          </el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>
