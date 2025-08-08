<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'

interface Props {
  siteKey: string
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
const isScriptLoaded = ref(false)
const loadingError = ref<string>('')

// 检查 Turnstile 脚本是否已加载
const checkTurnstileLoaded = (): boolean => {
  return typeof window !== 'undefined' && 'turnstile' in window && typeof (window as any).turnstile.render === 'function'
}

// 加载 Turnstile 脚本
const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (checkTurnstileLoaded()) {
      console.log('Turnstile script already loaded')
      isScriptLoaded.value = true
      resolve()
      return
    }

    // 检查是否已经有脚本标签在加载
    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      console.log('Turnstile script is loading...')
      existingScript.addEventListener('load', () => {
        isScriptLoaded.value = true
        resolve()
      })
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load existing Turnstile script'))
      })
      return
    }

    console.log('Loading Turnstile script...')
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      console.log('Turnstile script loaded successfully')
      isScriptLoaded.value = true
      resolve()
    }

    script.onerror = () => {
      console.error('Failed to load Turnstile script')
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })
}

// 渲染 Turnstile 组件
const renderTurnstile = async () => {
  if (!widgetRef.value) {
    console.error('Widget ref not available')
    return
  }

  if (!isScriptLoaded.value || !checkTurnstileLoaded()) {
    console.error('Turnstile script not loaded')
    return
  }

  try {
    console.log('Rendering Turnstile with siteKey:', props.siteKey)
    const turnstile = (window as any).turnstile

    // 清除之前的内容
    widgetRef.value.innerHTML = ''

    widgetId.value = turnstile.render(widgetRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      callback: (token: string) => {
        console.log('Turnstile success callback:', token)
        emit('success', token)
      },
      'error-callback': (error: string) => {
        console.error('Turnstile error callback:', error)
        emit('error', error)
      },
      'expired-callback': () => {
        console.log('Turnstile expired callback')
        emit('expired')
      },
      'timeout-callback': () => {
        console.log('Turnstile timeout callback')
        emit('timeout')
      },
      'after-interactive-callback': () => {
        console.log('Turnstile after interactive callback')
        emit('afterInteractive')
      },
      'before-interactive-callback': () => {
        console.log('Turnstile before interactive callback')
        emit('beforeInteractive')
      },
      'unsupported-callback': () => {
        console.log('Turnstile unsupported callback')
        emit('unsupported')
      }
    })

    console.log('Turnstile rendered with ID:', widgetId.value)
    isLoaded.value = true
    loadingError.value = ''
  } catch (error) {
    console.error('Failed to render Turnstile:', error)
    loadingError.value = `渲染失败: ${error}`
    emit('error', 'Failed to render Turnstile widget')
  }
}

// 重置 Turnstile 组件
const reset = () => {
  if (widgetId.value && checkTurnstileLoaded()) {
    try {
      const turnstile = (window as any).turnstile
      turnstile.reset(widgetId.value)
    } catch (error) {
      console.error('Failed to reset Turnstile:', error)
    }
  }
}

// 移除 Turnstile 组件
const remove = () => {
  if (widgetId.value && checkTurnstileLoaded()) {
    try {
      const turnstile = (window as any).turnstile
      turnstile.remove(widgetId.value)
      isLoaded.value = false
      widgetId.value = undefined
    } catch (error) {
      console.error('Failed to remove Turnstile:', error)
    }
  }
}

// 获取响应 token
const getResponse = (): string | undefined => {
  if (widgetId.value && checkTurnstileLoaded()) {
    try {
      const turnstile = (window as any).turnstile
      return turnstile.getResponse(widgetId.value)
    } catch (error) {
      console.error('Failed to get Turnstile response:', error)
    }
  }
  return undefined
}

// 监听主题变化
watch(() => props.theme, () => {
  if (isLoaded.value) {
    remove()
    setTimeout(renderTurnstile, 100)
  }
})

onMounted(async () => {
  console.log('TurnstileWidget mounted')

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
    await renderTurnstile()

    // 通知父组件加载完成
    emit('afterInteractive')
  } catch (error) {
    console.error('Failed to initialize Turnstile:', error)
    loadingError.value = `初始化失败: ${error}`
    emit('error', 'Failed to load Turnstile')
  }
})

onUnmounted(() => {
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
    <!-- 调试信息 -->
    <div v-if="loadingError || !isLoaded" class="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
      <div>Site Key: {{ props.siteKey }}</div>
      <div>Script Loaded: {{ isScriptLoaded }}</div>
      <div>Widget Loaded: {{ isLoaded }}</div>
      <div>Widget ID: {{ widgetId || 'None' }}</div>
      <div v-if="loadingError" class="text-red-500">Error: {{ loadingError }}</div>
    </div>

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
          <span class="text-sm">加载人机验证...</span>
        </div>
      </div>

      <!-- 错误状态 -->
      <div v-if="loadingError" class="flex items-center justify-center p-4">
        <div class="text-red-500 text-sm">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          {{ loadingError }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.turnstile-widget {
  min-height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.turnstile-loading {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
}

.dark .turnstile-loading {
  background-color: #1f2937;
  border-color: #374151;
}

.turnstile-loaded {
  min-height: auto;
}
</style>
