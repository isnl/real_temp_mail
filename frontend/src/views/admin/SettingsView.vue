<script lang="ts" setup>
import SystemSettings from '@/components/admin/SystemSettings.vue'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="admin-page">
    <SystemSettings />
  </div>
</template>

<style scoped>
.admin-page {
  @apply p-6;
}
</style>
