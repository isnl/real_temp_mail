<script lang="ts" setup>
import UserManagement from '@/components/admin/UserManagement.vue'
</script>

<template>
  <div class="space-y-6">
    <!-- 页面描述 -->
    <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
      <p class="text-sm text-purple-700 dark:text-purple-400">
        管理系统用户账号、配额和权限
      </p>
    </div>

    <!-- 用户管理内容 -->
    <UserManagement />
  </div>
</template>
