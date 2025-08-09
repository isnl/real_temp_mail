<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
  content: string
  maxLines?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxLines: 3
})

// 简单的文本转HTML函数（保留换行）
const textToHtml = (text: string): string => {
  if (!text) return ''

  // 转义HTML特殊字符
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    // 换行转为<br>
    .replace(/\n/g, '<br>')

  return html
}

// 渲染的HTML
const renderedHtml = computed(() => textToHtml(props.content))
</script>

<template>
  <div
    class="text-content"
    :class="{ [`line-clamp-${maxLines}`]: maxLines > 0 }"
    v-html="renderedHtml"
  ></div>
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
