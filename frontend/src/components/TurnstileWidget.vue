<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { getTurnstile, loadTurnstileScript } from '@/utils/turnstileLoader'

interface Props {
  siteKey: string
  action: 'login' | 'register' | 'redeem' | 'public-inbox'
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

interface Emits {
  (e: 'success', token: string): void
  (e: 'error', error: string): void
  (e: 'expired'): void
  (e: 'timeout'): void
  (e: 'afterInteractive'): void
  (e: 'beforeInteractive'): void
  (e: 'unsupported'): void
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'auto',
  size: 'normal'
})

const emit = defineEmits<Emits>()

const widgetRef = ref<HTMLDivElement>()
const widgetId = ref<string>()
const isLoaded = ref(false)
const loadingError = ref<string>('')
let destroyed = false
let renderTimer: number | undefined

// 渲染 Turnstile 组件
const renderTurnstile = async () => {
  const container = widgetRef.value
  const turnstile = getTurnstile()
  if (!container || !turnstile || destroyed) return false

  try {
    remove()
    container.innerHTML = ''
    if (!props.siteKey.trim()) throw new Error('未配置 Turnstile Site Key')

    widgetId.value = turnstile.render(container, {
      sitekey: props.siteKey,
      action: props.action,
      theme: props.theme,
      size: props.size,
      callback: (token: string) => {
        emit('success', token)
      },
      'error-callback': (error: string) => {
        emit('error', error)
      },
      'expired-callback': () => {
        emit('expired')
      },
      'timeout-callback': () => {
        emit('timeout')
      },
      'after-interactive-callback': () => {
        emit('afterInteractive')
      },
      'before-interactive-callback': () => {
        emit('beforeInteractive')
      },
      'unsupported-callback': () => {
        emit('unsupported')
      }
    })

    isLoaded.value = true
    loadingError.value = ''
    return true
  } catch (error) {
    loadingError.value = error instanceof Error ? error.message : '人机验证渲染失败'
    emit('error', loadingError.value)
    return false
  }
}

// 重置 Turnstile 组件
const reset = () => {
  const turnstile = getTurnstile()
  if (widgetId.value && turnstile) {
    try {
      turnstile.reset(widgetId.value)
    } catch {
      // 静默处理重置错误
    }
  }
}

// 移除 Turnstile 组件
const remove = () => {
  const turnstile = getTurnstile()
  if (widgetId.value && turnstile) {
    try {
      turnstile.remove(widgetId.value)
    } catch {
      // 静默处理移除错误
    }
  }
  isLoaded.value = false
  widgetId.value = undefined
}

// 获取响应 token
const getResponse = (): string | undefined => {
  const turnstile = getTurnstile()
  if (widgetId.value && turnstile) {
    try {
      return turnstile.getResponse(widgetId.value)
    } catch {
      // 静默处理获取响应错误
    }
  }
  return undefined
}

const scheduleRender = () => {
  if (destroyed) return
  if (renderTimer !== undefined) window.clearTimeout(renderTimer)
  // Removing a solved widget invalidates the response held by the parent.
  // This most commonly happens when the user changes the color theme.
  if (widgetId.value) emit('expired')
  remove()
  renderTimer = window.setTimeout(async () => {
    renderTimer = undefined
    await nextTick()
    await renderTurnstile()
  }, 0)
}

watch([() => props.siteKey, () => props.action, () => props.theme, () => props.size], scheduleRender)

onMounted(async () => {
  try {
    // 通知父组件开始加载
    emit('beforeInteractive')

    // 等待 DOM 完全渲染
    await nextTick()

    // 加载脚本
    await loadTurnstileScript()

    // 再次等待确保脚本完全加载
    await nextTick()

    // 渲染组件
    const rendered = await renderTurnstile()

    // 通知父组件加载完成
    if (rendered) emit('afterInteractive')
  } catch (error) {
    console.error('TurnstileWidget initialization error:', error)
    loadingError.value = error instanceof Error ? error.message : '人机验证加载失败'
    emit('error', loadingError.value)
  }
})

onUnmounted(() => {
  destroyed = true
  if (renderTimer !== undefined) window.clearTimeout(renderTimer)
  remove()
})

// 暴露方法给父组件
defineExpose({
  reset,
  remove,
  getResponse
})
</script>

<template>
  <div class="turnstile-container">
    <!-- Turnstile Widget 容器 -->
    <div
      ref="widgetRef"
      class="turnstile-widget"
      :class="{
        'turnstile-loading': !isLoaded,
        'turnstile-loaded': isLoaded
      }"
    >
      <!-- 加载状态 -->
      <div v-if="!isLoaded && !loadingError" class="flex items-center justify-center p-4">
        <div class="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
          <div class="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          <span class="text-sm">
            加载人机验证...
          </span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="loadingError" class="flex items-center justify-center p-4">
        <div class="text-red-500 text-sm">
          <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-1" />
          {{ loadingError }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.turnstile-widget {
  display: flex;
  align-items: center;
  justify-content: center;
}



.turnstile-loaded {
  min-height: auto;
}
</style>
