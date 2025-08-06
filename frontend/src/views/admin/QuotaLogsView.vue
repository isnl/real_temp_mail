<script lang="ts" setup>
import QuotaLogManagement from '@/components/admin/QuotaLogManagement.vue'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="admin-page">
    <QuotaLogManagement />
  </div>
</template>

<style scoped>
.admin-page {
  @apply p-6;
}
</style>
