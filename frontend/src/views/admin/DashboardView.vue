<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardStats } from '@/api/admin'
import type { AdminDashboardStats } from '@/api/admin'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const loading = ref(false)
const stats = ref<AdminDashboardStats | null>(null)

const loadStats = async () => {
  try {
    loading.value = true
    const response = await getDashboardStats()
    if (response.success && response.data) {
      stats.value = response.data
    } else {
      ElMessage.error(response.error || '获取统计数据失败')
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  } finally {
    loading.value = false
  }
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 页面描述 -->
    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
      <p class="text-sm text-blue-700 dark:text-blue-400">
        查看系统整体运行状况和关键指标
      </p>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>

    <!-- 统计卡片 -->
    <div v-else-if="stats" class="space-y-6">
      <!-- 基础统计 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'users']" class="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">总用户数</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.users.total) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">活跃: {{ formatNumber(stats.users.active) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'envelope']" class="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">临时邮箱</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.tempEmails.total) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">活跃: {{ formatNumber(stats.tempEmails.active) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'globe']" class="text-yellow-600 dark:text-yellow-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">活跃域名</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.domains.active) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">总计: {{ formatNumber(stats.domains.total) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'envelope-open']" class="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">今日邮件</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.emails.today) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">总计: {{ formatNumber(stats.emails.total) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 新增统计卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- 配额活动统计 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'coins']" class="text-emerald-600 dark:text-emerald-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">配额活动</p>
              <p class="text-2xl font-semibold text-green-600 dark:text-green-400">+{{ formatNumber(stats.quotaActivity.totalEarned) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">今日: +{{ formatNumber(stats.quotaActivity.todayEarned) }}</p>
            </div>
          </div>
        </div>

        <!-- 签到统计 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'calendar-check']" class="text-cyan-600 dark:text-cyan-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">签到统计</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.checkinActivity.totalCheckins) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">今日: {{ formatNumber(stats.checkinActivity.todayCheckins) }}</p>
            </div>
          </div>
        </div>

        <!-- 用户活跃度 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'user-clock']" class="text-indigo-600 dark:text-indigo-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">活跃用户</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.recentActivity.todayActiveUsers) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">本周: {{ formatNumber(stats.recentActivity.weekActiveUsers) }}</p>
            </div>
          </div>
        </div>

        <!-- 系统健康状态 -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-rose-100 dark:bg-rose-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon
                :icon="['fas', stats.systemHealth.status === 'healthy' ? 'heart' : 'exclamation-triangle']"
                :class="[
                  'text-xl',
                  stats.systemHealth.status === 'healthy' ? 'text-rose-600 dark:text-rose-400' : 'text-red-600 dark:text-red-400'
                ]"
              />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">系统状态</p>
              <p :class="[
                'text-2xl font-semibold',
                stats.systemHealth.status === 'healthy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              ]">
                {{ stats.systemHealth.status === 'healthy' ? '健康' : '异常' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-500">
                响应: {{ stats.systemHealth.responseTime || 0 }}ms
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 兑换码和配额统计 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'ticket-alt']" class="text-orange-600 dark:text-orange-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">兑换码</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.redeemCodes.total) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">已用: {{ formatNumber(stats.redeemCodes.used) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="text-teal-600 dark:text-teal-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">配额分布</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.quotaDistribution.totalQuota) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">已用: {{ formatNumber(stats.quotaDistribution.usedQuota) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'user-plus']" class="text-pink-600 dark:text-pink-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">新用户</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">{{ formatNumber(stats.recentActivity.todayRegistrations) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">本周: {{ formatNumber(stats.recentActivity.weekRegistrations) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div class="flex items-center">
            <div class="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-lg flex items-center justify-center">
              <font-awesome-icon :icon="['fas', 'minus-circle']" class="text-violet-600 dark:text-violet-400 text-xl" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">配额消费</p>
              <p class="text-2xl font-semibold text-orange-600 dark:text-orange-400">{{ formatNumber(stats.quotaActivity.totalConsumed) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-500">今日: {{ formatNumber(stats.quotaActivity.todayConsumed) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else class="text-center py-12">
      <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="text-4xl text-gray-400 mb-4" />
      <p class="text-gray-500 dark:text-gray-400">无法加载统计数据</p>
      <button @click="loadStats" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        重试
      </button>
    </div>
  </div>
</template>
