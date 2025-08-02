<script lang="ts" setup>
import { ref } from 'vue'

const activeTab = ref('users')
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        管理后台
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        系统管理和监控
      </p>
    </div>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" class="admin-tabs">
      <el-tab-pane label="用户管理" name="users">
        <div class="card-base p-6">
          <h3 class="text-lg font-semibold mb-4">用户管理</h3>
          <p class="text-gray-600 dark:text-gray-400">用户管理功能开发中...</p>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="域名管理" name="domains">
        <div class="card-base p-6">
          <h3 class="text-lg font-semibold mb-4">域名管理</h3>
          <p class="text-gray-600 dark:text-gray-400">域名管理功能开发中...</p>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="系统监控" name="monitor">
        <div class="card-base p-6">
          <h3 class="text-lg font-semibold mb-4">系统监控</h3>
          <p class="text-gray-600 dark:text-gray-400">系统监控功能开发中...</p>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>
