<script lang="ts" setup>
// 管理后台仪表板页面
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 页面描述 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
      <p class="text-sm text-blue-700 dark:text-blue-400">
        查看系统整体运行状况和关键指标
      </p>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="users" class="text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">总用户数</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">1,234</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="envelope" class="text-green-600 dark:text-green-400 text-xl" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">临时邮箱</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">5,678</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="globe" class="text-yellow-600 dark:text-yellow-400 text-xl" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">活跃域名</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">12</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
            <font-awesome-icon icon="chart-line" class="text-red-600 dark:text-red-400 text-xl" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">今日邮件</p>
            <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">89</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
