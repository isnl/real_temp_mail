<script lang="ts" setup>
import RedeemCodeManagement from '@/components/admin/RedeemCodeManagement.vue'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <!-- 兑换码管理内容 -->
  <RedeemCodeManagement />
</template>
