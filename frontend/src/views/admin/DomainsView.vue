<script lang="ts" setup>
import DomainManagement from '@/components/admin/DomainManagement.vue'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <!-- 域名管理内容 -->
  <DomainManagement />
</template>
