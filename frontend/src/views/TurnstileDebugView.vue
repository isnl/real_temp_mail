<script lang="ts" setup>
import { ref } from 'vue'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

const turnstile = useTurnstile()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()

// 处理 Turnstile 验证成功
const handleTurnstileSuccess = (token: string) => {
  turnstile.handleSuccess(token)
  console.log('✅ Turnstile Success:', token)
}

// 处理 Turnstile 验证失败
const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
  console.log('❌ Turnstile Error:', error)
}

// 处理加载前
const handleBeforeInteractive = () => {
  turnstile.handleBeforeInteractive()
  console.log('🔄 Turnstile Before Interactive')
}

// 处理加载后
const handleAfterInteractive = () => {
  turnstile.handleAfterInteractive()
  console.log('✨ Turnstile After Interactive')
}

// 处理过期
const handleExpired = () => {
  turnstile.handleExpired()
  console.log('⏰ Turnstile Expired')
}

// 处理超时
const handleTimeout = () => {
  turnstile.handleTimeout()
  console.log('⏱️ Turnstile Timeout')
}

// 处理不支持
const handleUnsupported = () => {
  turnstile.handleUnsupported()
  console.log('🚫 Turnstile Unsupported')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Turnstile 加载状态调试
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          调试 Turnstile 组件的加载状态显示
        </p>
        <div class="mt-4 text-sm text-gray-500">
          Site Key: {{ turnstile.siteKey }}
        </div>
      </div>

      <!-- Debug Info -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          状态信息
        </h3>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div class="text-sm text-gray-600 dark:text-gray-400">isLoading</div>
            <div class="text-lg font-medium" :class="{
              'text-blue-600': turnstile.isLoading.value,
              'text-gray-600': !turnstile.isLoading.value
            }">
              {{ turnstile.isLoading.value ? 'true' : 'false' }}
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div class="text-sm text-gray-600 dark:text-gray-400">isVerified</div>
            <div class="text-lg font-medium" :class="{
              'text-green-600': turnstile.isVerified.value,
              'text-gray-600': !turnstile.isVerified.value
            }">
              {{ turnstile.isVerified.value ? 'true' : 'false' }}
            </div>
          </div>
        </div>

        <div v-if="turnstile.error.value" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <div class="text-red-800 dark:text-red-200">
            <strong>Error:</strong> {{ turnstile.error.value }}
          </div>
        </div>

        <div v-if="turnstile.turnstileToken.value" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div class="text-green-800 dark:text-green-200">
            <strong>Token:</strong> {{ turnstile.turnstileToken.value.substring(0, 30) }}...
          </div>
        </div>
      </div>

      <!-- Status Display (模拟登录页面的显示) -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          用户看到的状态 (模拟登录页面)
        </h3>
        
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div class="mb-2">
            <div v-if="turnstile.isLoading.value" class="text-blue-500 text-sm">
              <i class="fas fa-spinner fa-spin mr-1"></i>
              正在加载人机验证...
            </div>
            <div v-else-if="turnstile.isVerified.value" class="text-green-500 text-sm">
              <i class="fas fa-check-circle mr-1"></i>
              人机验证已完成
            </div>
            <div v-else class="text-gray-500 text-sm">
              <i class="fas fa-shield-alt mr-1"></i>
              请完成人机验证
            </div>
          </div>
          
          <!-- 错误信息显示 -->
          <div v-if="turnstile.error.value" class="text-red-500 text-sm mt-2">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            {{ turnstile.error.value }}
          </div>
        </div>
      </div>

      <!-- Turnstile Widget -->
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Turnstile 组件
        </h3>
        
        <TurnstileWidget
          ref="turnstileRef"
          :site-key="turnstile.siteKey"
          :theme="turnstile.theme.value"
          @success="handleTurnstileSuccess"
          @error="handleTurnstileError"
          @expired="handleExpired"
          @timeout="handleTimeout"
          @before-interactive="handleBeforeInteractive"
          @after-interactive="handleAfterInteractive"
          @unsupported="handleUnsupported"
        />
        
        <div class="mt-4 flex gap-2">
          <el-button @click="turnstileRef?.reset()" size="small">
            重置组件
          </el-button>
          <el-button @click="turnstile.reset()" size="small" type="warning">
            重置状态
          </el-button>
        </div>
      </div>

      <!-- Back Button -->
      <div class="text-center mt-8">
        <router-link to="/login">
          <el-button type="primary">
            返回登录页面
          </el-button>
        </router-link>
      </div>
    </div>
  </div>
</template>
