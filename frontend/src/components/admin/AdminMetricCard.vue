<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: number
    icon: string
    detail?: string
    tone?: 'brand' | 'success' | 'warm' | 'neutral'
  }>(),
  { tone: 'brand' },
)
</script>

<template>
  <article class="admin-metric-card" :class="`metric-tone-${tone}`">
    <div class="admin-metric-top">
      <span>{{ label }}</span>
      <span class="admin-metric-icon" aria-hidden="true"><font-awesome-icon :icon="icon" /></span>
    </div>
    <strong class="admin-metric-value">{{
      Number.isFinite(value) ? value.toLocaleString() : '—'
    }}</strong>
    <p v-if="detail" class="admin-metric-detail">{{ detail }}</p>
  </article>
</template>
