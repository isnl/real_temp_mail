<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'

const props = defineProps<{ currentPage: number; pageSize: number; total: number }>()
const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:pageSize': [size: number]
  'current-change': [page: number]
  'size-change': [size: number]
}>()
const compact = useMediaQuery('(max-width: 600px)')

const changePage = (page: number) => {
  if (page === props.currentPage) return
  emit('update:currentPage', page)
  emit('current-change', page)
}
const changeSize = (size: number) => {
  emit('update:pageSize', size)
  emit('update:currentPage', 1)
  emit('size-change', size)
}
</script>

<template>
  <div class="admin-pagination">
    <el-pagination
      :current-page="currentPage"
      :page-size="pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      :pager-count="5"
      :size="compact ? 'small' : 'default'"
      :layout="compact ? 'prev, pager, next' : 'sizes, prev, pager, next'"
      background
      @update:current-page="changePage"
      @update:page-size="changeSize"
    />
  </div>
</template>
