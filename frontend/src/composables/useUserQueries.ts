import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

export const useUserQueries = () => {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  // 获取当前用户信息（包括配额）
  const useCurrentUser = () => {
    return useQuery({
      queryKey: ['user', 'current'],
      queryFn: async () => {
        const response = await authApi.getCurrentUser()
        return response.data
      },
      enabled: !!authStore.accessToken // 只有在有token时才执行
    })
  }

  // 刷新用户信息
  const refreshUserInfo = () => {
    return queryClient.invalidateQueries(['user', 'current'])
  }

  // 手动更新用户配额（乐观更新）
  const updateUserQuotaOptimistic = (newQuota: number) => {
    queryClient.setQueryData(['user', 'current'], (oldData: any) => {
      if (oldData) {
        return { ...oldData, quota: newQuota }
      }
      return oldData
    })
    
    // 同时更新 authStore
    authStore.updateUserQuota(newQuota)
  }

  return {
    useCurrentUser,
    refreshUserInfo,
    updateUserQuotaOptimistic
  }
}
