import { computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { quotaApi, type QuotaInfo } from '@/api/quota'
import { useAuthStore } from '@/stores/auth'

const safeInteger = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0
}

const normalizeQuota = (value: QuotaInfo): QuotaInfo => {
  const used = safeInteger(value.used)
  const remaining = safeInteger(value.remaining)
  const suppliedTotal = safeInteger(value.total)

  return {
    ...value,
    used,
    remaining,
    // 后端总值短暂不同步时，以“已使用 + 剩余”为最低可信值，绝不显示负数。
    total: Math.max(suppliedTotal, used + remaining),
    expired: safeInteger(value.expired),
    expiring: safeInteger(value.expiring),
  }
}

export function useQuota() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const queryKey = computed(() => ['quota', 'info', authStore.user?.id ?? 'guest'] as const)

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await quotaApi.getQuotaInfo()
      if (!response.success || !response.data) {
        throw new Error(response.error || '获取配额信息失败')
      }
      return normalizeQuota(response.data)
    },
    enabled: computed(() => authStore.isAuthenticated && Boolean(authStore.user?.id)),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // user.quota 表示“剩余配额”。仅在已有完整服务端快照时合并，避免用不完整
  // 的本地值推导 total/used，正是旧页面先闪负数的根因。
  watch(
    () => authStore.user?.quota,
    (newRemaining) => {
      if (newRemaining === undefined) return
      queryClient.setQueryData<QuotaInfo>(queryKey.value, (oldData) => {
        if (!oldData) return oldData
        const remaining = safeInteger(newRemaining)
        const used = safeInteger(oldData.used)
        return normalizeQuota({ ...oldData, remaining, total: used + remaining })
      })
    },
  )

  const quotaInfo = computed<QuotaInfo>(() => query.data.value ?? {
    remaining: 0,
    used: 0,
    total: 0,
    expired: 0,
    expiring: 0,
  })

  const fetchQuotaInfo = async (force = false) => {
    if (!authStore.isAuthenticated) return
    if (!force && (query.isFetching.value || query.data.value)) return
    await query.refetch({ cancelRefetch: false })
  }

  const refreshQuotaInfo = () => queryClient.invalidateQueries({ queryKey: queryKey.value })

  return {
    quotaInfo,
    loading: computed(() => query.isPending.value || (query.isFetching.value && !query.data.value)),
    refreshing: computed(() => query.isFetching.value && Boolean(query.data.value)),
    ready: computed(() => Boolean(query.data.value)),
    error: query.error,
    fetchQuotaInfo,
    refreshQuotaInfo,
  }
}
