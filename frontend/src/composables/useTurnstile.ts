import { computed, readonly, ref, toValue, type MaybeRefOrGetter } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { usePublicSettings } from '@/composables/usePublicSettings'

export type TurnstileScope = 'login' | 'register' | 'redeem' | 'public-inbox' | 'general'

export function useTurnstile(
  scope: TurnstileScope = 'general',
  requiredOverride?: MaybeRefOrGetter<boolean>,
) {
  const themeStore = useThemeStore()
  const publicSettings = usePublicSettings()
  const turnstileToken = ref('')
  const verified = ref(false)
  const isLoading = ref(false)
  const error = ref('')

  // 公开配置有请求级缓存，多处使用不会造成重复请求。
  void publicSettings.load().catch(() => {
    error.value = '人机验证配置加载失败，请刷新页面重试'
  })

  const required = computed(() => {
    if (requiredOverride !== undefined) return Boolean(toValue(requiredOverride))
    if (scope === 'login') return publicSettings.loginTurnstileRequired.value
    if (scope === 'register') return publicSettings.registerTurnstileRequired.value
    if (scope === 'redeem') {
      return publicSettings.settings.value.turnstileEnabled
        && publicSettings.settings.value.turnstileRedeemEnabled
    }
    if (scope === 'public-inbox') {
      return publicSettings.settings.value.turnstileEnabled
        && publicSettings.settings.value.turnstilePublicInboxEnabled
    }
    return publicSettings.settings.value.turnstileEnabled
  })

  const siteKey = computed(() => publicSettings.settings.value.turnstileSiteKey)
  const isVerified = computed(() => !required.value || verified.value)
  const configurationError = computed(() => (
    required.value && !siteKey.value ? '管理员已开启人机验证，但尚未配置 Site Key' : ''
  ))

  const theme = computed(() => {
    if (themeStore.theme === 'auto') return 'auto'
    return themeStore.theme === 'dark' ? 'dark' : 'light'
  })

  const handleSuccess = (token: string) => {
    turnstileToken.value = token
    verified.value = Boolean(token)
    isLoading.value = false
    error.value = ''
  }

  const handleError = (message: string) => {
    turnstileToken.value = ''
    verified.value = false
    isLoading.value = false
    error.value = message || '人机验证失败，请重试'
  }

  const handleExpired = () => handleError('验证已过期，请重新验证')
  const handleTimeout = () => handleError('验证超时，请重新尝试')

  const handleBeforeInteractive = () => {
    isLoading.value = true
    error.value = ''
  }

  const handleAfterInteractive = () => {
    isLoading.value = false
  }

  const handleUnsupported = () => handleError('当前浏览器不支持人机验证')

  const reset = () => {
    turnstileToken.value = ''
    verified.value = false
    isLoading.value = false
    error.value = ''
  }

  const isRequired = (endpoint: string): boolean => {
    if (endpoint === '/api/auth/login') return publicSettings.loginTurnstileRequired.value
    if (endpoint === '/api/auth/register') return publicSettings.registerTurnstileRequired.value
    if (endpoint === '/api/email/redeem') {
      return publicSettings.settings.value.turnstileEnabled
        && publicSettings.settings.value.turnstileRedeemEnabled
    }
    if (endpoint === '/api/email/public-inbox') {
      return publicSettings.settings.value.turnstileEnabled
        && publicSettings.settings.value.turnstilePublicInboxEnabled
    }
    return publicSettings.settings.value.turnstileEnabled
  }

  return {
    turnstileToken: readonly(turnstileToken),
    isVerified,
    isLoading: readonly(isLoading),
    error: readonly(error),
    required,
    siteKey,
    configurationError,
    theme,
    handleSuccess,
    handleError,
    handleExpired,
    handleTimeout,
    handleBeforeInteractive,
    handleAfterInteractive,
    handleUnsupported,
    reset,
    isRequired,
  }
}
