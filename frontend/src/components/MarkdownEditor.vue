<script lang="ts" setup>
import { ref, nextTick } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  readonly?: boolean
  height?: string
  rows?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'editor-ready'): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '请输入内容...',
  readonly: false,
  height: '400px',
  rows: 10
})

const emit = defineEmits<Emits>()

const textareaRef = ref<HTMLTextAreaElement>()

// 处理输入变化
const handleInput = (value: string) => {
  emit('update:modelValue', value)
}

// 发出编辑器准备就绪事件
nextTick(() => {
  emit('editor-ready')
})

// 暴露方法给父组件
defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  getContent: () => props.modelValue || '',
  setContent: (content: string) => {
    emit('update:modelValue', content)
  }
})
</script>

<template>
  <div class="text-editor-wrapper">
    <el-input
      ref="textareaRef"
      :model-value="modelValue"
      type="textarea"
      :placeholder="placeholder"
      :readonly="readonly"
      :rows="rows"
      :style="{ height: height }"
      resize="vertical"
      @input="handleInput"
      class="text-editor"
    />
  </div>
</template>

<style scoped>
.text-editor-wrapper {
  position: relative;
  width: 100%;
}

.text-editor {
  width: 100%;
}

.text-editor :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
  width: 100%;
  box-sizing: border-box;
}

.text-editor :deep(.el-textarea__inner):focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-7);
}
</style>
