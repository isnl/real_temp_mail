import { ref, computed } from 'vue'
import { checkinApi, type QuotaInfo } from '@/api/checkin'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

export function useQuota() {
  const authStore = useAuthStore()
  const quotaInfo = ref<QuotaInfo | null>(null)
  const loading = ref(false)

  // 获取配额信息
  const fetchQuotaInfo = async () => {
    if (!authStore.isAuthenticated) return

    loading.value = true
    try {
      const response = await checkinApi.getQuotaInfo()
      if (response.success && response.data) {
        quotaInfo.value = response.data
      }
    } catch (error) {
      console.error('获取配额信息失败:', error)
      ElMessage.error('获取配额信息失败')
    } finally {
      loading.value = false
    }
  }

  // 计算属性
  const quotaData = computed(() => {
    if (quotaInfo.value) {
      return quotaInfo.value
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

  return {
    quotaInfo: quotaData,
    loading,
    usagePercentage,
    fetchQuotaInfo
  }
}
