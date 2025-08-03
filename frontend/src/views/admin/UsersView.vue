<script lang="ts" setup>
import UserManagement from '@/components/admin/UserManagement.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        用户管理
      </h2>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        管理系统用户账号、配额和权限
      </p>
    </div>

    <!-- 用户管理内容 -->
    <UserManagement />
  </div>
</template>
