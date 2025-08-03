<script lang="ts" setup>
import LogAudit from '@/components/admin/LogAudit.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        日志审计
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        查看系统操作日志和审计记录
      </p>
    </div>

    <!-- 日志审计内容 -->
    <LogAudit />
  </div>
</template>
