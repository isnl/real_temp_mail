<script setup lang="ts">
import WorkspaceLayout from './WorkspaceLayout.vue'
const menuItems = [
  { path: '/profile', title: '控制台', icon: 'inbox' },
  { path: '/profile/overview', title: '概览', icon: 'chart-pie' },
  { path: '/profile/quota', title: '配额管理', icon: 'coins' },
  { path: '/profile/security', title: '安全设置', icon: 'user-lock' },
]
</script>
<template><WorkspaceLayout area="profile" :items="menuItems" /></template>
