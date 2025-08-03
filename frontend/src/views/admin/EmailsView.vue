<script lang="ts" setup>
import EmailAudit from '@/components/admin/EmailAudit.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        邮件审查
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        查看和管理系统中的所有邮件
      </p>
    </div>

    <!-- 邮件审查内容 -->
    <EmailAudit />
  </div>
</template>
