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
const { quotaInfo, fetchQuotaInfo } = useQuota()

const user = computed(() => authStore.user)

// 配额记录相关状态
const quotaLogs = ref<QuotaLog[]>([])
const quotaLoading = ref(false)
const quotaTotal = ref(0)
const quotaPage = ref(1)
const quotaPageSize = ref(50) // 增加每页显示数量
const activeTab = ref('all') // 当前激活的标签页

// 计算过滤后的配额记录
const filteredQuotaLogs = computed(() => {
  const now = new Date()

  return quotaLogs.value.filter(log => {
    if (activeTab.value === 'all') return true

    if (log.type !== 'earn') return false // 只显示获得的配额

    if (activeTab.value === 'expired') {
      // 已过期：有过期时间且已过期
      return log.expires_at && new Date(log.expires_at) <= now
    }

    if (activeTab.value === 'expiring') {
      // 即将过期：有过期时间且在24小时内过期
      if (!log.expires_at) return false
      const expiresAt = new Date(log.expires_at)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      return expiresAt > now && expiresAt <= tomorrow
    }

    if (activeTab.value === 'permanent') {
      // 永不过期：没有过期时间
      return !log.expires_at
    }

    return true
  })
})

// 切换标签页
const handleTabChange = (tab: string) => {
  activeTab.value = tab
}

// 判断配额是否已过期
const isQuotaExpired = (log: QuotaLog): boolean => {
  if (!log.expires_at) return false
  return new Date(log.expires_at) <= new Date()
}

// 判断配额是否即将过期（24小时内）
const isQuotaExpiring = (log: QuotaLog): boolean => {
  if (!log.expires_at) return false
  const now = new Date()
  const expiresAt = new Date(log.expires_at)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return expiresAt > now && expiresAt <= tomorrow
}

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
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
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

      <!-- 已过期配额 -->
      <div class="card-base p-6" v-if="quotaInfo.expired && quotaInfo.expired > 0">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon
              :icon="['fas', 'clock']"
              class="text-red-600 dark:text-red-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">已过期配额</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">
              {{ quotaInfo.expired }}
            </p>
            <p class="text-xs text-red-500 dark:text-red-400 mt-1">
              这些配额已过期无法使用
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 即将过期配额警告 -->
    <div v-if="quotaInfo.expiring && quotaInfo.expiring > 0" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
      <div class="flex items-center space-x-3">
        <font-awesome-icon
          :icon="['fas', 'exclamation-triangle']"
          class="text-orange-600 dark:text-orange-400 text-xl"
        />
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-orange-800 dark:text-orange-200">
            配额即将过期提醒
          </h3>
          <p class="text-orange-700 dark:text-orange-300 mt-1">
            您有 <span class="font-bold">{{ quotaInfo.expiring }}</span> 个配额将在24小时内过期，请尽快使用！
          </p>
          <p class="text-sm text-orange-600 dark:text-orange-400 mt-2">
            💡 提示：签到获得的配额会在当天24点过期，建议优先使用即将过期的配额创建临时邮箱。
          </p>
        </div>
      </div>
    </div>

    <!-- 使用情况详情 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        使用情况
      </h3>
      
      <div class="space-y-6">


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

      <!-- Tab 切换 -->
      <el-tabs v-model="activeTab" class="mb-4" @tab-change="handleTabChange">
        <el-tab-pane label="全部记录" name="all">
          <template #label>
            <span class="flex items-center">
              <font-awesome-icon icon="list" class="mr-2" />
              全部记录
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="permanent">
          <template #label>
            <span class="flex items-center text-green-600">
              <font-awesome-icon icon="infinity" class="mr-2" />
              永不过期
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="expiring">
          <template #label>
            <span class="flex items-center text-orange-600">
              <font-awesome-icon icon="exclamation-triangle" class="mr-2" />
              即将过期
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="expired">
          <template #label>
            <span class="flex items-center text-red-600">
              <font-awesome-icon icon="times-circle" class="mr-2" />
              已过期
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <div v-if="filteredQuotaLogs.length === 0 && !quotaLoading" class="text-center py-8">
        <font-awesome-icon :icon="['fas', 'inbox']" class="text-4xl text-gray-400 mb-4" />
        <p class="text-gray-500 dark:text-gray-400">
          {{ activeTab === 'all' ? '暂无配额记录' :
             activeTab === 'permanent' ? '暂无永不过期的配额' :
             activeTab === 'expiring' ? '暂无即将过期的配额' :
             '暂无已过期的配额' }}
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="log in filteredQuotaLogs"
          :key="log.id"
          :class="[
            'flex items-center justify-between p-4 rounded-lg border-l-4',
            isQuotaExpired(log)
              ? 'bg-red-50 dark:bg-red-900/20 border-l-red-500'
              : isQuotaExpiring(log)
              ? 'bg-orange-50 dark:bg-orange-900/20 border-l-orange-500'
              : 'bg-gray-50 dark:bg-gray-700/50 border-l-blue-500'
          ]"
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
              <!-- 显示过期时间信息 -->
              <p v-if="log.type === 'earn'" class="text-xs mt-1">
                <span v-if="log.expires_at">
                  <span v-if="isQuotaExpired(log)" class="text-red-600 dark:text-red-400 font-medium">
                    <font-awesome-icon icon="times-circle" class="mr-1" />
                    已过期 - {{ new Date(log.expires_at).toLocaleString('zh-CN') }}
                  </span>
                  <span v-else-if="isQuotaExpiring(log)" class="text-orange-600 dark:text-orange-400 font-medium">
                    <font-awesome-icon icon="exclamation-triangle" class="mr-1" />
                    即将过期 - {{ new Date(log.expires_at).toLocaleString('zh-CN') }}
                  </span>
                  <span v-else class="text-blue-600 dark:text-blue-400">
                    <font-awesome-icon icon="clock" class="mr-1" />
                    {{ new Date(log.expires_at).toLocaleString('zh-CN') }} 过期
                  </span>
                </span>
                <span v-else class="text-green-600 dark:text-green-400 font-medium">
                  <font-awesome-icon icon="infinity" class="mr-1" />
                  永不过期
                </span>
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
