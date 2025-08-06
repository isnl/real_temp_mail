<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useQuota } from '@/composables/useQuota'
import { ElMessage } from 'element-plus'
import { checkinApi, formatQuotaSource, formatQuotaType, getQuotaSourceIcon } from '@/api/checkin'
import type { QuotaLog } from '@/types'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const authStore = useAuthStore()
const { quotaInfo, fetchQuotaInfo, usagePercentage } = useQuota()

const user = computed(() => authStore.user)

// 配额记录相关状态
const quotaLogs = ref<QuotaLog[]>([])
const quotaLoading = ref(false)
const quotaTotal = ref(0)
const quotaPage = ref(1)
const quotaPageSize = ref(10)

// 兑换码相关
const redeemCode = ref('')
const redeemLoading = ref(false)

onMounted(async () => {
  await fetchQuotaInfo()
  await loadQuotaLogs()
})

// 加载配额记录
const loadQuotaLogs = async (reset = true) => {
  if (reset) {
    quotaPage.value = 1
    quotaLogs.value = []
  }

  quotaLoading.value = true
  try {
    const response = await checkinApi.getQuotaLogs(quotaPage.value, quotaPageSize.value)
    if (response.success && response.data) {
      if (reset) {
        quotaLogs.value = response.data.logs
      } else {
        quotaLogs.value.push(...response.data.logs)
      }
      quotaTotal.value = response.data.total
    }
  } catch (error) {
    console.error('Load quota logs error:', error)
    ElMessage.error('加载配额记录失败')
  } finally {
    quotaLoading.value = false
  }
}

// 加载更多配额记录
const loadMoreQuotaLogs = async () => {
  quotaPage.value++
  await loadQuotaLogs(false)
}

// 兑换配额
const redeemQuota = async () => {
  if (!redeemCode.value.trim()) {
    ElMessage.warning('请输入兑换码')
    return
  }

  redeemLoading.value = true
  try {
    // TODO: 调用兑换API
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟API调用
    
    ElMessage.success('兑换成功！配额已增加')
    redeemCode.value = ''
    
    // 刷新数据
    await authStore.fetchCurrentUser()
    await fetchQuotaInfo()
    await loadQuotaLogs()
  } catch (error) {
    console.error('Redeem quota error:', error)
    ElMessage.error('兑换失败，请检查兑换码是否正确')
  } finally {
    redeemLoading.value = false
  }
}

// usagePercentage 已经从 useQuota composable 中获取，无需重复定义

// 获取配额类型统计
const quotaStats = computed(() => {
  const stats = {
    earn: { count: 0, amount: 0 },
    use: { count: 0, amount: 0 }
  }
  
  quotaLogs.value.forEach(log => {
    if (log.type === 'earn') {
      stats.earn.count++
      stats.earn.amount += log.amount
    } else {
      stats.use.count++
      stats.use.amount += log.amount
    }
  })
  
  return stats
})

// 获取配额来源统计
const sourceStats = computed(() => {
  const stats: Record<string, { count: number; amount: number }> = {}
  
  quotaLogs.value.forEach(log => {
    if (!stats[log.source]) {
      stats[log.source] = { count: 0, amount: 0 }
    }
    stats[log.source].count++
    stats[log.source].amount += log.amount
  })
  
  return Object.entries(stats).map(([source, data]) => ({
    source,
    ...data,
    name: formatQuotaSource(source)
  }))
})
</script>

<template>
  <div class="space-y-6">
    <!-- 配额概览 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 剩余配额 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon
              :icon="['fas', 'envelope']"
              class="text-blue-600 dark:text-blue-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">剩余配额</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.remaining }}
            </p>
          </div>
        </div>
      </div>

      <!-- 已使用 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon 
              :icon="['fas', 'chart-line']" 
              class="text-orange-600 dark:text-orange-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">已使用</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.used }}
            </p>
          </div>
        </div>
      </div>

      <!-- 剩余配额 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon 
              :icon="['fas', 'battery-three-quarters']" 
              class="text-green-600 dark:text-green-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">剩余配额</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.remaining }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用情况详情 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        使用情况
      </h3>
      
      <div class="space-y-6">
        <!-- 使用率进度条 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">配额使用率</span>
            <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ usagePercentage }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              :class="[
                'h-3 rounded-full transition-all duration-500',
                usagePercentage >= 90 ? 'bg-red-500' :
                usagePercentage >= 70 ? 'bg-orange-500' : 'bg-green-500'
              ]"
              :style="{ width: `${usagePercentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ quotaInfo.used }} / {{ quotaInfo.total }} 个邮箱
          </p>
        </div>

        <!-- 统计信息 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="flex items-center space-x-3">
              <font-awesome-icon 
                :icon="['fas', 'plus-circle']" 
                class="text-green-600 dark:text-green-400 text-xl"
              />
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">获得配额</p>
                <p class="text-xl font-bold text-green-600 dark:text-green-400">
                  +{{ quotaStats.earn.amount }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ quotaStats.earn.count }} 次记录
                </p>
              </div>
            </div>
          </div>

          <div class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <div class="flex items-center space-x-3">
              <font-awesome-icon 
                :icon="['fas', 'minus-circle']" 
                class="text-orange-600 dark:text-orange-400 text-xl"
              />
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">使用配额</p>
                <p class="text-xl font-bold text-orange-600 dark:text-orange-400">
                  -{{ quotaStats.use.amount }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ quotaStats.use.count }} 次记录
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 兑换配额 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        兑换配额
      </h3>
      
      <div class="max-w-md">
        <div class="flex space-x-3">
          <el-input
            v-model="redeemCode"
            placeholder="请输入兑换码"
            class="flex-1"
          >
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'gift']" class="text-gray-400" />
            </template>
          </el-input>
          <el-button 
            type="primary" 
            @click="redeemQuota"
            :loading="redeemLoading"
          >
            兑换
          </el-button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          输入有效的兑换码可以增加您的邮箱配额
        </p>
      </div>
    </div>

    <!-- 配额来源统计 -->
    <div class="card-base p-6" v-if="sourceStats.length > 0">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        配额来源统计
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="stat in sourceStats"
          :key="stat.source"
          class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <font-awesome-icon
              :icon="['fas', getQuotaSourceIcon(stat.source)]"
              class="text-blue-600 dark:text-blue-400 text-lg"
            />
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ stat.name }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ stat.count }} 次 · {{ stat.amount }} 配额
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 配额记录 -->
    <div class="card-base p-6">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          配额记录
        </h3>
        <el-button @click="loadQuotaLogs" size="small" :loading="quotaLoading">
          <font-awesome-icon :icon="['fas', 'refresh']" class="mr-1" />
          刷新
        </el-button>
      </div>

      <div v-if="quotaLogs.length === 0 && !quotaLoading" class="text-center py-8">
        <font-awesome-icon :icon="['fas', 'inbox']" class="text-4xl text-gray-400 mb-4" />
        <p class="text-gray-500 dark:text-gray-400">暂无配额记录</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="log in quotaLogs"
          :key="log.id"
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div class="flex items-center space-x-4">
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center',
                log.type === 'earn' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
              ]"
            >
              <font-awesome-icon
                :icon="['fas', getQuotaSourceIcon(log.source)]"
                :class="[
                  'text-sm',
                  log.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                ]"
              />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                {{ log.description || formatQuotaSource(log.source) }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ new Date(log.created_at).toLocaleString('zh-CN') }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p
              :class="[
                'text-lg font-semibold',
                log.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
              ]"
            >
              {{ log.type === 'earn' ? '+' : '-' }}{{ log.amount }}
            </p>
            <el-tag
              :type="log.type === 'earn' ? 'success' : 'warning'"
              size="small"
            >
              {{ formatQuotaType(log.type) }}
            </el-tag>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="quotaTotal > quotaLogs.length" class="flex justify-center mt-6">
          <el-button
            @click="loadMoreQuotaLogs"
            :loading="quotaLoading"
            size="small"
          >
            <font-awesome-icon :icon="['fas', 'chevron-down']" class="mr-1" />
            加载更多 ({{ quotaLogs.length }}/{{ quotaTotal }})
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>
