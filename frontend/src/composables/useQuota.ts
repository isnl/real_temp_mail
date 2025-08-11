import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { checkinApi, type QuotaInfo } from '@/api/checkin'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

export function useQuota() {
  const authStore = useAuthStore()
  const queryClient = useQueryClient()
  const quotaInfo = ref<QuotaInfo | null>(null)
  const loading = ref(false)

  // 🔥 使用 vue-query 管理配额信息
  const { data: quotaQueryData, isLoading, refetch } = useQuery({
    queryKey: ['quota', 'info'],
    queryFn: async () => {
      const response = await checkinApi.getQuotaInfo()
      if (response.success && response.data) {
        return response.data
      }
      throw new Error('获取配额信息失败')
    },
    enabled: computed(() => authStore.isAuthenticated),
    staleTime: 30000, // 30秒内不重新获取
    refetchOnWindowFocus: false,
    retry: 3, // 🎯 增加重试次数
    retryDelay: 1000 // 🎯 重试延迟
  })

  // 🎯 监听 authStore 的用户配额变化，同步更新 vue-query 缓存
  watch(
    () => authStore.user?.quota,
    (newQuota) => {
      if (newQuota !== undefined && quotaQueryData.value) {
        // 更新 vue-query 缓存中的配额信息
        queryClient.setQueryData(['quota', 'info'], (oldData: QuotaInfo | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              total: newQuota,
              remaining: newQuota - oldData.used
            }
          }
          return {
            total: newQuota,
            used: 0,
            remaining: newQuota
          }
        })
      }
    },
    { immediate: true }
  )

  // 获取配额信息（保持向后兼容）
  const fetchQuotaInfo = async () => {
    if (!authStore.isAuthenticated) return

    try {
      await refetch()
    } catch (error) {
      console.error('获取配额信息失败:', error)
      ElMessage.error('获取配额信息失败')
    }
  }

  // 计算属性
  const quotaData = computed(() => {
    if (quotaQueryData.value) {
      return quotaQueryData.value
    }

    // 🔥 修复：如果没有从 API 获取到数据，使用正确的后备逻辑
    // authStore.userQuota 实际上是剩余配额，不是总配额
    const remaining = authStore.userQuota || 0

    return {
      remaining, // 剩余配额
      used: 0, // 暂时设为 0，因为我们无法准确计算
      total: remaining // 🎯 修复：当无法获取已用配额时，总配额等于剩余配额
    }
  })

  const usagePercentage = computed(() => {
    const { total, used } = quotaData.value
    return total > 0 ? Math.round((used / total) * 100) : 0
  })

  // 🎯 手动刷新配额信息的方法
  const refreshQuotaInfo = () => {
    return queryClient.invalidateQueries({ queryKey: ['quota', 'info'] })
  }

  return {
    quotaInfo: quotaData,
    loading: computed(() => isLoading.value),
    usagePercentage,
    fetchQuotaInfo,
    refreshQuotaInfo
  }
}
