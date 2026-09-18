<script setup lang="ts">
import { useSiteBranding } from '@/composables/useSiteBranding'
const { siteName } = useSiteBranding()
defineProps<{ compact?: boolean }>()
</script>

<template>
  <router-link to="/" class="brand-logo" :aria-label="`${siteName}首页`" :title="siteName">
    <img src="/brand-mark.png" alt="" width="36" height="36" />
    <span v-if="!compact">{{ siteName }}</span>
  </router-link>
</template>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--text-primary);
  text-decoration: none;
}
.brand-logo img {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  object-fit: contain;
}
.brand-logo span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 16px;
  font-weight: 720;
  letter-spacing: -0.4px;
  white-space: nowrap;
}
</style>
