<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardStats, formatNumber } from '@/api/admin'
import type { AdminDashboardStats } from '@/api/admin'

const loading = ref(false)
const stats = ref<AdminDashboardStats | null>(null)

const loadStats = async () => {
  try {
    loading.value = true
    const response = await getDashboardStats()
    if (response.success) {
      stats.value = response.data!
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

onMounted(() => {
  loadStats()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        系统概览
      </h2>
      <el-button 
        type="primary" 
        :loading="loading" 
        @click="loadStats"
        class="btn-primary"
      >
        <font-awesome-icon icon="refresh" class="mr-2" />
        刷新数据
      </el-button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <el-loading />
    </div>

    <div v-else-if="stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 用户统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="users" 
              class="text-3xl text-blue-500 dark:text-blue-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              用户总数
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.users.total) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              活跃: {{ formatNumber(stats.users.active) }} | 
              管理员: {{ formatNumber(stats.users.admins) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 临时邮箱统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="envelope" 
              class="text-3xl text-green-500 dark:text-green-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              临时邮箱
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.tempEmails.total) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              活跃: {{ formatNumber(stats.tempEmails.active) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 邮件统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="inbox" 
              class="text-3xl text-purple-500 dark:text-purple-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              邮件总数
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.emails.total) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              今日: {{ formatNumber(stats.emails.today) }} | 
              本周: {{ formatNumber(stats.emails.thisWeek) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 域名统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="globe" 
              class="text-3xl text-orange-500 dark:text-orange-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              域名总数
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.domains.total) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              启用: {{ formatNumber(stats.domains.active) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 兑换码统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="ticket" 
              class="text-3xl text-red-500 dark:text-red-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              兑换码
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.redeemCodes.total) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              已用: {{ formatNumber(stats.redeemCodes.used) }} | 
              可用: {{ formatNumber(stats.redeemCodes.unused) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 配额统计 -->
      <div class="card-base p-6 md:col-span-2 lg:col-span-3">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon 
              icon="chart-pie" 
              class="text-3xl text-indigo-500 dark:text-indigo-400"
            />
          </div>
          <div class="ml-4 flex-1">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              配额使用情况
            </p>
            <div class="mt-2 grid grid-cols-3 gap-4">
              <div>
                <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatNumber(stats.quotaDistribution.totalQuota) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500">总配额</p>
              </div>
              <div>
                <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatNumber(stats.quotaDistribution.usedQuota) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500">已使用</p>
              </div>
              <div>
                <p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ formatNumber(Math.round(stats.quotaDistribution.averageQuotaPerUser)) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-500">平均配额</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 新增统计卡片 -->
    <div v-if="stats" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- 配额活动统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon
              icon="coins"
              class="text-3xl text-yellow-500 dark:text-yellow-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              配额活动
            </p>
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">
              +{{ formatNumber(stats.quotaActivity.totalEarned) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              今日: +{{ formatNumber(stats.quotaActivity.todayEarned) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 签到统计 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon
              icon="calendar-check"
              class="text-3xl text-blue-500 dark:text-blue-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              签到统计
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.checkinActivity.totalCheckins) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              今日: {{ formatNumber(stats.checkinActivity.todayCheckins) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 用户活跃度 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon
              icon="user-clock"
              class="text-3xl text-purple-500 dark:text-purple-400"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              活跃用户
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ formatNumber(stats.recentActivity.todayActiveUsers) }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              本周: {{ formatNumber(stats.recentActivity.weekActiveUsers) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 系统健康状态 -->
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon
              :icon="stats.systemHealth.status === 'healthy' ? 'heart' : 'exclamation-triangle'"
              :class="[
                'text-3xl',
                stats.systemHealth.status === 'healthy' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              ]"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              系统状态
            </p>
            <p :class="[
              'text-2xl font-bold',
              stats.systemHealth.status === 'healthy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            ]">
              {{ stats.systemHealth.status === 'healthy' ? '健康' : '异常' }}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              响应时间: {{ stats.systemHealth.responseTime }}ms
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <font-awesome-icon 
        icon="exclamation-triangle" 
        class="text-4xl text-gray-400 dark:text-gray-600 mb-4"
      />
      <p class="text-gray-600 dark:text-gray-400">暂无统计数据</p>
    </div>
  </div>
</template>

<style scoped>
.card-base {
  @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md;
}

.btn-primary {
  @apply px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors;
}
</style>
