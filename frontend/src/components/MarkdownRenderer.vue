<script lang="ts" setup>
interface Props {
  content: string
  maxLines?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLines: 3
})
</script>

<template>
  <div
    class="text-content"
    :class="{ [`line-clamp-${maxLines}`]: maxLines > 0 }"
  >{{ props.content }}</div>
</template>

<style scoped>
.text-content {
  font-size: 13px;
  line-height: 1.4;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-word;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
