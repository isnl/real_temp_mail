<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface Props {
  siteKey?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
  language?: string
  action?: string
  cData?: string
  callback?: string
  errorCallback?: string
  expiredCallback?: string
  beforeInteractiveCallback?: string
  afterInteractiveCallback?: string
  unsupportedCallback?: string
  refreshExpired?: 'auto' | 'manual' | 'never'
}

interface Emits {
  (e: 'success', token: string): void
  (e: 'error', error: string): void
  (e: 'expired'): void
  (e: 'beforeInteractive'): void
  (e: 'afterInteractive'): void
  (e: 'unsupported'): void
}

const props = withDefaults(defineProps<Props>(), {
  siteKey: () => import.meta.env.VITE_TURNSTILE_SITE_KEY || '',
  theme: 'auto',
  size: 'normal',
  language: 'zh-CN',
  refreshExpired: 'auto'
})

const emit = defineEmits<Emits>()

const turnstileRef = ref<HTMLDivElement>()
const widgetId = ref<string>()
const isLoaded = ref(false)
const isRendered = ref(false)

// 检查是否在开发环境
const isDev = import.meta.env.DEV

// 全局回调函数名
const callbackName = `turnstile_callback_${Math.random().toString(36).substr(2, 9)}`
const errorCallbackName = `turnstile_error_${Math.random().toString(36).substr(2, 9)}`
const expiredCallbackName = `turnstile_expired_${Math.random().toString(36).substr(2, 9)}`

// 设置全局回调函数
;(window as any)[callbackName] = (token: string) => {
  emit('success', token)
}

;(window as any)[errorCallbackName] = (error: string) => {
  emit('error', error)
}

;(window as any)[expiredCallbackName] = () => {
  emit('expired')
}

const loadTurnstileScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 开发环境直接返回
    if (isDev) {
      isLoaded.value = true
      resolve()
      return
    }

    // 检查是否已经加载
    if ((window as any).turnstile) {
      isLoaded.value = true
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      isLoaded.value = true
      resolve()
    }
    
    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'))
    }
    
    document.head.appendChild(script)
  })
}

const renderWidget = () => {
  if (!isLoaded.value || !turnstileRef.value || isRendered.value) {
    return
  }

  // 开发环境模拟
  if (isDev) {
    isRendered.value = true
    // 模拟延迟后自动成功
    setTimeout(() => {
      emit('success', 'dev-token')
    }, 1000)
    return
  }

  if (!(window as any).turnstile) {
    return
  }

  try {
    widgetId.value = (window as any).turnstile.render(turnstileRef.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      language: props.language,
      action: props.action,
      cData: props.cData,
      callback: callbackName,
      'error-callback': errorCallbackName,
      'expired-callback': expiredCallbackName,
      'refresh-expired': props.refreshExpired
    })
    isRendered.value = true
  } catch (error) {
    console.error('Failed to render Turnstile widget:', error)
    emit('error', 'Failed to render widget')
  }
}

const reset = () => {
  if (!isRendered.value || isDev) return
  
  if ((window as any).turnstile && widgetId.value) {
    try {
      (window as any).turnstile.reset(widgetId.value)
    } catch (error) {
      console.error('Failed to reset Turnstile widget:', error)
    }
  }
}

const remove = () => {
  if (!isRendered.value || isDev) return
  
  if ((window as any).turnstile && widgetId.value) {
    try {
      (window as any).turnstile.remove(widgetId.value)
      isRendered.value = false
      widgetId.value = undefined
    } catch (error) {
      console.error('Failed to remove Turnstile widget:', error)
    }
  }
}

const getResponse = (): string | undefined => {
  if (isDev) return 'dev-token'
  
  if (!isRendered.value || !(window as any).turnstile || !widgetId.value) {
    return undefined
  }
  
  try {
    return (window as any).turnstile.getResponse(widgetId.value)
  } catch (error) {
    console.error('Failed to get Turnstile response:', error)
    return undefined
  }
}

// 监听主题变化
watch(() => props.theme, () => {
  if (isRendered.value) {
    remove()
    setTimeout(renderWidget, 100)
  }
})

onMounted(async () => {
  try {
    await loadTurnstileScript()
    renderWidget()
  } catch (error) {
    console.error('Failed to initialize Turnstile:', error)
    emit('error', 'Failed to initialize')
  }
})

onUnmounted(() => {
  remove()
  
  // 清理全局回调函数
  delete (window as any)[callbackName]
  delete (window as any)[errorCallbackName]
  delete (window as any)[expiredCallbackName]
})

// 暴露方法给父组件
defineExpose({
  reset,
  remove,
  getResponse
})
</script>

<template>
  <div class="turnstile-widget">
    <!-- 开发环境显示模拟组件 -->
    <div v-if="isDev" class="dev-turnstile">
      <div class="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
        <div class="text-center">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">开发环境 - 模拟人机验证</div>
          <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
    
    <!-- 生产环境 Turnstile 组件 -->
    <div v-else ref="turnstileRef" class="turnstile-container"></div>
  </div>
</template>

<style scoped>
.turnstile-widget {
  display: inline-block;
}

.dev-turnstile {
  min-height: 65px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.turnstile-container {
  min-height: 65px;
}
</style>
