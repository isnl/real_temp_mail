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
        <h3 class="text-xl font-semibold mb-2">隔离阅读</h3>
        <p class="text-gray-600 dark:text-gray-400">
          HTML 邮件在受限 iframe 中展示，并禁止脚本、表单和外部资源加载
        </p>
      </div>

      <div class="card-base p-6">
        <font-awesome-icon 
          :icon="['fas', 'clock']" 
          class="text-green-500 text-3xl mb-4"
        />
        <h3 class="text-xl font-semibold mb-2">集中收件</h3>
        <p class="text-gray-600 dark:text-gray-400">
          在一个控制台管理多个临时地址，并可随时刷新查看最新来信
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
