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
    refetchOnWindowFocus: false
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

    // 如果没有从 API 获取到数据，使用旧的计算方式作为后备
    return {
      remaining: authStore.userQuota,
      used: 0, // 暂时设为 0，因为我们无法准确计算
      total: authStore.userQuota
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
