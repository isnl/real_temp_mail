<script setup lang="ts">
import { computed, ref, useId } from 'vue'

const props = defineProps<{ loading?: boolean; filters?: object }>()
defineEmits<{ search: []; reset: [] }>()
const expanded = ref(false)
const fieldsId = useId()
const filterCount = computed(
  () =>
    Object.values(props.filters ?? {}).filter(
      (value) => value !== '' && value !== undefined && value !== null && value !== 'all',
    ).length,
)
</script>

<template>
  <el-form
    class="admin-filter-bar"
    :class="{ 'is-expanded': expanded }"
    label-position="top"
    @submit.prevent="$emit('search')"
  >
    <div :id="fieldsId" class="admin-filter-fields"><slot /></div>
    <div class="admin-filter-actions">
      <el-button type="primary" native-type="submit" :loading="loading">
        <font-awesome-icon icon="search" />搜索
      </el-button>
      <el-button :disabled="loading" @click="$emit('reset')">重置</el-button>
      <button
        type="button"
        class="admin-filter-toggle"
        :aria-expanded="expanded"
        :aria-controls="fieldsId"
        @click="expanded = !expanded"
      >
        <font-awesome-icon icon="sliders" />
        {{ expanded ? '收起' : '筛选' }}
        <span v-if="filterCount" class="admin-filter-count">{{ filterCount }}</span>
        <font-awesome-icon icon="chevron-down" :class="{ 'is-expanded': expanded }" />
      </button>
    </div>
  </el-form>
</template>
