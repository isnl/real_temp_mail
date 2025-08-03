<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  line-height: 1.6;
}

body {
  margin: 0;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  transition:
    background-color 0.3s,
    color 0.3s;
}

/* Element Plus 暗色模式变量覆盖 */
.dark {
  --el-bg-color: #1a1a1a;
  --el-bg-color-page: #0d1117;
  --el-text-color-primary: #e6edf3;
  --el-text-color-regular: #c9d1d9;
  --el-border-color: #30363d;
  --el-border-color-light: #21262d;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.dark ::-webkit-scrollbar-thumb {
  background: #555;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
