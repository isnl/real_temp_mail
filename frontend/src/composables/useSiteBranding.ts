import { computed } from 'vue'
import { usePublicSettings } from './usePublicSettings'

export function useSiteBranding() {
  const { settings } = usePublicSettings()
  return {
    siteName: computed(() => settings.value.siteName),
    contactEmail: computed(() => settings.value.contactEmail),
  }
}
