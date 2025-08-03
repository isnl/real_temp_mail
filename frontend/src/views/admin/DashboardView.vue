<script lang="ts" setup>
// 管理后台仪表板页面
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        管理后台仪表板
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        查看系统整体运行状况和关键指标
      </p>
    </div>

    <!-- 布局测试信息 -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        布局分离测试
      </h3>

      <div class="space-y-4">
        <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h4 class="font-medium text-purple-800 dark:text-purple-300 mb-2">
            ✓ 当前使用 AdminLayout 布局
          </h4>
          <p class="text-sm text-purple-700 dark:text-purple-400">
            这个页面使用完全独立的管理后台布局，包含侧边栏导航和顶部栏。
          </p>
        </div>

        <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 class="font-medium text-green-800 dark:text-green-300 mb-2">
            ✓ 无用户端头部冲突
          </h4>
          <p class="text-sm text-green-700 dark:text-green-400">
            管理后台不会显示用户端的 AppHeader，避免了双重头部的问题。
          </p>
        </div>

        <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 class="font-medium text-blue-800 dark:text-blue-300 mb-2">
            ✓ 完全独立的布局系统
          </h4>
          <p class="text-sm text-blue-700 dark:text-blue-400">
            管理后台有自己的主题切换、用户菜单和导航系统。
          </p>
        </div>
      </div>
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
