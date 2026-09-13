import { computed, readonly, ref } from 'vue'
import { authApi } from '@/api/auth'
import type { PublicSystemSettings } from '@/types'

const DEFAULT_SETTINGS: PublicSystemSettings = {
  registrationEnabled: false,
  githubEnabled: false,
  turnstileEnabled: false,
  turnstileSiteKey: '',
  turnstileLoginEnabled: false,
  turnstileRegisterEnabled: false,
  turnstileRedeemEnabled: false,
  turnstilePublicInboxEnabled: false,
}

const settings = ref<PublicSystemSettings>({ ...DEFAULT_SETTINGS })
const loading = ref(false)
const loaded = ref(false)
const error = ref('')
let inFlightRequest: Promise<PublicSystemSettings> | null = null
let loadedAt = 0
const CACHE_TTL = 60_000

const toBoolean = (value: unknown): boolean => value === true || value === 'true' || value === 1 || value === '1'

const normalizeSettings = (value: Partial<PublicSystemSettings>): PublicSystemSettings => ({
  registrationEnabled: toBoolean(value.registrationEnabled),
  githubEnabled: toBoolean(value.githubEnabled),
  turnstileEnabled: toBoolean(value.turnstileEnabled),
  turnstileSiteKey: typeof value.turnstileSiteKey === 'string' ? value.turnstileSiteKey.trim() : '',
  turnstileLoginEnabled: toBoolean(value.turnstileLoginEnabled),
  turnstileRegisterEnabled: toBoolean(value.turnstileRegisterEnabled),
  turnstileRedeemEnabled: toBoolean(value.turnstileRedeemEnabled),
  turnstilePublicInboxEnabled: toBoolean(value.turnstilePublicInboxEnabled),
})

export const loadPublicSettings = async (force = false): Promise<PublicSystemSettings> => {
  if (!force && loaded.value && Date.now() - loadedAt < CACHE_TTL) return settings.value
  if (inFlightRequest) {
    if (!force) return inFlightRequest
    // 强制刷新不能复用保存设置之前发出的旧请求。
    await inFlightRequest.catch(() => undefined)
  }

  loading.value = true
  error.value = ''
  inFlightRequest = authApi.getPublicSettings()
    .then((response) => {
      if (!response.success || !response.data) {
        throw new Error(response.error || '无法读取系统登录配置')
      }

      settings.value = normalizeSettings(response.data)
      loaded.value = true
      loadedAt = Date.now()
      return settings.value
    })
    .catch((reason: unknown) => {
      error.value = reason instanceof Error ? reason.message : '无法读取系统登录配置'
      throw reason
    })
    .finally(() => {
      loading.value = false
      inFlightRequest = null
    })

  return inFlightRequest
}

export const usePublicSettings = () => {
  const loginTurnstileRequired = computed(() => (
    settings.value.turnstileEnabled && settings.value.turnstileLoginEnabled
  ))
  const registerTurnstileRequired = computed(() => (
    settings.value.turnstileEnabled && settings.value.turnstileRegisterEnabled
  ))

  return {
    settings: readonly(settings),
    loading: readonly(loading),
    loaded: readonly(loaded),
    error: readonly(error),
    loginTurnstileRequired,
    registerTurnstileRequired,
    load: loadPublicSettings,
  }
}
