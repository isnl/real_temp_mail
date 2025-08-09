import { ref, computed, readonly } from 'vue'
import { useThemeStore } from '@/stores/theme'

// Turnstile 配置
const isDev = import.meta.env.DEV
const TURNSTILE_SITE_KEY = isDev
  ? '1x00000000000000000000AA' // 开发环境测试密钥
  : '0x4AAAAAABo_hK-8xkK5jEPM' // 生产环境密钥

export function useTurnstile() {
  const themeStore = useThemeStore()
  const turnstileToken = ref<string>('')
  const isVerified = ref(false)
  const isLoading = ref(false) // 初始状态为未加载
  const error = ref<string>('')

  // 根据当前主题设置 Turnstile 主题
  const turnstileTheme = computed(() => {
    if (themeStore.theme === 'auto') {
      return 'auto'
    }
    return themeStore.theme === 'dark' ? 'dark' : 'light'
  })

  // 处理验证成功
  const handleSuccess = (token: string) => {
    // 开发环境使用虚拟token
    turnstileToken.value = isDev ? 'XXXX.DUMMY.TOKEN.XXXX' : token
    isVerified.value = true
    isLoading.value = false
    error.value = ''
  }

  // 处理验证失败
  const handleError = (errorMessage: string) => {
    turnstileToken.value = ''
    isVerified.value = false
    isLoading.value = false
    error.value = errorMessage || '人机验证失败'
  }

  // 处理验证过期
  const handleExpired = () => {
    turnstileToken.value = ''
    isVerified.value = false
    isLoading.value = false
    error.value = '验证已过期，请重新验证'
  }

  // 处理验证超时
  const handleTimeout = () => {
    turnstileToken.value = ''
    isVerified.value = false
    isLoading.value = false
    error.value = '验证超时，请重新尝试'
  }

  // 处理交互前回调
  const handleBeforeInteractive = () => {
    isLoading.value = true
    error.value = ''
  }

  // 处理交互后回调
  const handleAfterInteractive = () => {
    isLoading.value = false
  }

  // 处理不支持的情况
  const handleUnsupported = () => {
    turnstileToken.value = ''
    isVerified.value = false
    isLoading.value = false
    error.value = '您的浏览器不支持人机验证'
  }

  // 重置验证状态
  const reset = () => {
    turnstileToken.value = ''
    isVerified.value = false
    isLoading.value = false
    error.value = ''
  }

  // 验证是否需要 Turnstile（根据接口路径判断）
  const isRequired = (endpoint: string): boolean => {
    const requiredEndpoints = [
      '/api/auth/register',
      '/api/auth/login',
      '/api/email/create',
      '/api/email/redeem'
    ]
    return requiredEndpoints.includes(endpoint)
  }

  return {
    // 状态
    turnstileToken: readonly(turnstileToken),
    isVerified: readonly(isVerified),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // 配置
    siteKey: TURNSTILE_SITE_KEY,
    theme: turnstileTheme,
    
    // 方法
    handleSuccess,
    handleError,
    handleExpired,
    handleTimeout,
    handleBeforeInteractive,
    handleAfterInteractive,
    handleUnsupported,
    reset,
    isRequired
  }
}
