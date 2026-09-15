<script setup lang="ts">
defineProps<{ loading?: boolean }>()
defineEmits<{ search: []; reset: [] }>()
</script>

<template>
  <el-form class="admin-filter-bar" label-position="top" @submit.prevent="$emit('search')">
    <slot />
    <div class="admin-filter-actions">
      <el-button type="primary" native-type="submit" :loading="loading">
        <font-awesome-icon icon="search" />搜索
      </el-button>
      <el-button :disabled="loading" @click="$emit('reset')">重置</el-button>
    </div>
  </el-form>
</template>
