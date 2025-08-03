<script lang="ts" setup>
import { ref } from 'vue'
import DashboardStats from '@/components/admin/DashboardStats.vue'
import UserManagement from '@/components/admin/UserManagement.vue'
import DomainManagement from '@/components/admin/DomainManagement.vue'
import EmailAudit from '@/components/admin/EmailAudit.vue'
import LogAudit from '@/components/admin/LogAudit.vue'
import RedeemCodeManagement from '@/components/admin/RedeemCodeManagement.vue'
import SystemSettings from '@/components/admin/SystemSettings.vue'

const activeTab = ref('dashboard')
</script>

<template>
  <div class="flex flex-col gap-6">
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
      <el-tab-pane name="dashboard">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="chart-line" class="mr-2" />
            仪表板
          </span>
        </template>
        <DashboardStats />
      </el-tab-pane>

      <el-tab-pane name="users">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="users" class="mr-2" />
            用户管理
          </span>
        </template>
        <UserManagement />
      </el-tab-pane>

      <el-tab-pane name="domains">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="globe" class="mr-2" />
            域名管理
          </span>
        </template>
        <DomainManagement />
      </el-tab-pane>

      <el-tab-pane name="emails">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="envelope-open" class="mr-2" />
            邮件审查
          </span>
        </template>
        <EmailAudit />
      </el-tab-pane>

      <el-tab-pane name="logs">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="file-alt" class="mr-2" />
            日志审计
          </span>
        </template>
        <LogAudit />
      </el-tab-pane>

      <el-tab-pane name="redeem-codes">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="ticket" class="mr-2" />
            兑换码管理
          </span>
        </template>
        <RedeemCodeManagement />
      </el-tab-pane>

      <el-tab-pane name="settings">
        <template #label>
          <span class="flex items-center">
            <font-awesome-icon icon="cog" class="mr-2" />
            系统设置
          </span>
        </template>
        <SystemSettings />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.admin-tabs {
  @apply min-h-screen;
}

.admin-tabs :deep(.el-tabs__header) {
  @apply bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg;
}

.admin-tabs :deep(.el-tabs__nav-wrap) {
  @apply px-6;
}

.admin-tabs :deep(.el-tabs__content) {
  @apply pt-6;
}
</style>
