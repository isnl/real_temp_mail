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
const isDev = import.meta.env.DEV

// 检查 Turnstile 脚本是否已加载
const checkTurnstileLoaded = (): boolean => {
  return typeof window !== 'undefined' && 'turnstile' in window && typeof (window as any).turnstile.render === 'function'
}

// 加载 Turnstile 脚本
const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 检查是否已经加载
    if (checkTurnstileLoaded()) {
      isScriptLoaded.value = true
      resolve()
      return
    }

    // 检查是否已经有脚本标签在加载
    const existingScript = document.querySelector('script[src*="turnstile"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        isScriptLoaded.value = true
        resolve()
      })
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load existing Turnstile script'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      isScriptLoaded.value = true
      resolve()
    }

    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })
}

// 渲染 Turnstile 组件
const renderTurnstile = async () => {
  if (!widgetRef.value) {
    return
  }

  if (!isScriptLoaded.value || !checkTurnstileLoaded()) {
    return
  }

  try {
    const turnstile = (window as any).turnstile

    // 清除之前的内容
    widgetRef.value.innerHTML = ''

    widgetId.value = turnstile.render(widgetRef.value, {
      sitekey: props.siteKey,
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
  } catch (error) {
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
      // 静默处理重置错误
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
      // 静默处理移除错误
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
      // 静默处理获取响应错误
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
  try {
    // 通知父组件开始加载
    emit('beforeInteractive')

    // 开发环境直接模拟成功
    if (import.meta.env.DEV) {
      await nextTick()
      isLoaded.value = true
      emit('afterInteractive')
      // 延迟一点时间模拟真实验证过程
      setTimeout(() => {
        emit('success', 'XXXX.DUMMY.TOKEN.XXXX')
      }, 1000)
      return
    }

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
            {{ isDev ? '开发环境模拟验证...' : '加载人机验证...' }}
          </span>
        </div>
      </div>

      <!-- 开发环境成功状态 -->
      <div v-if="isLoaded && isDev" class="flex items-center justify-center p-4">
        <div class="flex items-center space-x-2 text-green-500">
          <i class="fas fa-check-circle"></i>
          <span class="text-sm">开发环境 - 验证已通过</span>
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
  display: flex;
  align-items: center;
  justify-content: center;
}



.turnstile-loaded {
  min-height: auto;
}
</style>
