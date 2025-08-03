<script lang="ts" setup>
import RedeemCodeManagement from '@/components/admin/RedeemCodeManagement.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        兑换码管理
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        创建和管理系统兑换码
      </p>
    </div>

    <!-- 兑换码管理内容 -->
    <RedeemCodeManagement />
  </div>
</template>
