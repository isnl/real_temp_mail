<script lang="ts" setup>
import DomainManagement from '@/components/admin/DomainManagement.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        域名管理
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        添加和管理邮箱域名，控制域名状态
      </p>
    </div>

    <!-- 域名管理内容 -->
    <DomainManagement />
  </div>
</template>
