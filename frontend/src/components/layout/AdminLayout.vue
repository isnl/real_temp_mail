<script setup lang="ts">
import WorkspaceLayout from './WorkspaceLayout.vue'
import '@/assets/admin.css'
const menuItems = [
  {
    key: 'dashboard',
    title: '仪表板',
    icon: 'tachometer-alt',
    path: '/admin/dashboard',
  },
  {
    key: 'users',
    title: '用户管理',
    icon: 'users',
    path: '/admin/users',
  },
  {
    key: 'domains',
    title: '域名管理',
    icon: 'globe',
    path: '/admin/domains',
  },
  {
    key: 'emails',
    title: '邮件审查',
    icon: 'envelope-open',
    path: '/admin/emails',
  },
  {
    key: 'announcements',
    title: '公告管理',
    icon: 'bullhorn',
    path: '/admin/announcements',
  },
  {
    key: 'logs',
    title: '日志审计',
    icon: 'file-alt',
    path: '/admin/logs',
  },
  {
    key: 'redeem-codes',
    title: '兑换码管理',
    icon: 'ticket-alt',
    path: '/admin/redeem-codes',
  },
  {
    key: 'quota-logs',
    title: '配额记录',
    icon: 'coins',
    path: '/admin/quota-logs',
  },
  {
    key: 'settings',
    title: '系统设置',
    icon: 'cog',
    path: '/admin/settings',
  },
]
</script>
<template><WorkspaceLayout area="admin" :items="menuItems" /></template>
