<script lang="ts" setup>
import EmailAudit from '@/components/admin/EmailAudit.vue'
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 页面描述 -->
    <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
      <p class="text-sm text-orange-700 dark:text-orange-400">
        查看和管理系统中的所有邮件，支持搜索、导出和批量操作
      </p>
    </div>

    <!-- 邮件审查内容 -->
    <EmailAudit />
  </div>
</template>
