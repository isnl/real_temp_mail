<script lang="ts" setup>
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        功能特性
      </h1>
      <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        了解我们提供的强大功能，让您的临时邮箱使用体验更加便捷
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card-base p-6">
        <font-awesome-icon 
          :icon="['fas', 'shield-alt']" 
          class="text-blue-500 text-3xl mb-4"
        />
        <h3 class="text-xl font-semibold mb-2">安全加密</h3>
        <p class="text-gray-600 dark:text-gray-400">
          端到端加密保护您的邮件内容，确保隐私安全
        </p>
      </div>

      <div class="card-base p-6">
        <font-awesome-icon 
          :icon="['fas', 'clock']" 
          class="text-green-500 text-3xl mb-4"
        />
        <h3 class="text-xl font-semibold mb-2">实时接收</h3>
        <p class="text-gray-600 dark:text-gray-400">
          邮件实时推送，无需刷新页面即可查看最新邮件
        </p>
      </div>

      <div class="card-base p-6">
        <font-awesome-icon 
          :icon="['fas', 'code']" 
          class="text-purple-500 text-3xl mb-4"
        />
        <h3 class="text-xl font-semibold mb-2">智能识别</h3>
        <p class="text-gray-600 dark:text-gray-400">
          自动识别验证码，一键复制，提升使用体验
        </p>
      </div>
    </div>
  </div>
</template>
