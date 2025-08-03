<script lang="ts" setup>
import DashboardStats from '@/components/admin/DashboardStats.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        系统概览
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        查看系统整体运行状况和关键指标
      </p>
    </div>

    <!-- 仪表板内容 -->
    <DashboardStats />
  </div>
</template>
