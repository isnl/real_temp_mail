<script lang="ts" setup>
import LogAudit from '@/components/admin/LogAudit.vue'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 页面描述 -->
    <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
      <p class="text-sm text-red-700 dark:text-red-400">
        查看系统操作日志和审计记录，监控用户行为和系统安全
      </p>
    </div>

    <!-- 日志审计内容 -->
    <LogAudit />
  </div>
</template>
