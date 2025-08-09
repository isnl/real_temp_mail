<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiClient } from '@/api/request'
import { formatQuotaSource, formatQuotaType, getQuotaTypeColor, getQuotaSourceIcon } from '@/api/checkin'
import type { ApiResponse, PaginatedResponse } from '@/types'

// 配额记录类型
interface QuotaLogWithUser {
  id: number
  user_id: number
  type: 'earn' | 'consume'
  amount: number
  source: 'register' | 'checkin' | 'redeem_code' | 'admin_adjust' | 'create_email'
  description: string | null
  related_id: number | null
  created_at: string
  user_email: string
}

interface QuotaStats {
  totalEarned: number
  totalConsumed: number
  todayEarned: number
  todayConsumed: number
  sourceStats: Array<{ source: string; count: number; amount: number }>
}

const loading = ref(false)
const quotaLogs = ref<QuotaLogWithUser[]>([])
const quotaStats = ref<QuotaStats | null>(null)
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = reactive({
  userId: '',
  type: '',
  source: '',
  startDate: '',
  endDate: ''
})

const loadQuotaLogs = async () => {
  try {
    loading.value = true
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString()
    })
    
    if (searchForm.userId) params.append('userId', searchForm.userId)
    if (searchForm.type) params.append('type', searchForm.type)
    if (searchForm.source) params.append('source', searchForm.source)
    if (searchForm.startDate) params.append('startDate', searchForm.startDate)
    if (searchForm.endDate) params.append('endDate', searchForm.endDate)
    
    const response = await apiClient.get<PaginatedResponse<QuotaLogWithUser>>(`/api/admin/quota-logs?${params}`)
    if (response.success && response.data) {
      quotaLogs.value = response.data.data
      total.value = response.data.total
    } else {
      ElMessage.error(response.error || '获取配额记录失败')
    }
  } catch (error) {
    console.error('获取配额记录失败:', error)
    ElMessage.error('获取配额记录失败')
  } finally {
    loading.value = false
  }
}

const loadQuotaStats = async () => {
  try {
    const response = await apiClient.get<QuotaStats>('/api/admin/quota-stats')
    if (response.success && response.data) {
      quotaStats.value = response.data
    }
  } catch (error) {
    console.error('获取配额统计失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadQuotaLogs()
}

const handleReset = () => {
  Object.assign(searchForm, {
    userId: '',
    type: '',
    source: '',
    startDate: '',
    endDate: ''
  })
  currentPage.value = 1
  loadQuotaLogs()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadQuotaLogs()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadQuotaLogs()
}

onMounted(() => {
  loadQuotaLogs()
  loadQuotaStats()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          配额记录管理
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          查看和管理所有用户的配额变动记录
        </p>
      </div>
      
      <el-button @click="loadQuotaLogs" :loading="loading" size="default">
        <font-awesome-icon :icon="['fas', 'refresh']" class="mr-2" />
        刷新
      </el-button>
    </div>

    <!-- Stats Cards -->
    <div v-if="quotaStats" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card-base p-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mr-3">
            <font-awesome-icon :icon="['fas', 'plus-circle']" class="text-green-600 dark:text-green-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">总获得</p>
            <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ quotaStats.totalEarned }}</p>
          </div>
        </div>
      </div>

      <div class="card-base p-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mr-3">
            <font-awesome-icon :icon="['fas', 'minus-circle']" class="text-orange-600 dark:text-orange-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">总消费</p>
            <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ quotaStats.totalConsumed }}</p>
          </div>
        </div>
      </div>

      <div class="card-base p-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
            <font-awesome-icon :icon="['fas', 'calendar-day']" class="text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">今日获得</p>
            <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ quotaStats.todayEarned }}</p>
          </div>
        </div>
      </div>

      <div class="card-base p-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mr-3">
            <font-awesome-icon :icon="['fas', 'calendar-minus']" class="text-purple-600 dark:text-purple-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">今日消费</p>
            <p class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ quotaStats.todayConsumed }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Form -->
    <div class="card-base p-4">
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <el-input
          v-model="searchForm.userId"
          placeholder="用户ID"
          clearable
        />
        
        <el-select v-model="searchForm.type" placeholder="类型" clearable>
          <el-option label="获得" value="earn" />
          <el-option label="消费" value="consume" />
        </el-select>
        
        <el-select v-model="searchForm.source" placeholder="来源" clearable>
          <el-option label="注册赠送" value="register" />
          <el-option label="每日签到" value="checkin" />
          <el-option label="兑换码" value="redeem_code" />
          <el-option label="管理员调整" value="admin_adjust" />
          <el-option label="创建邮箱" value="create_email" />
        </el-select>
        
        <el-date-picker
          v-model="searchForm.startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
        
        <el-date-picker
          v-model="searchForm.endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
        
        <div class="flex gap-2">
          <el-button @click="handleSearch" type="primary">
            <font-awesome-icon :icon="['fas', 'search']" class="mr-1" />
            搜索
          </el-button>
          <el-button @click="handleReset">
            <font-awesome-icon :icon="['fas', 'undo']" class="mr-1" />
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- Quota Logs Table -->
    <div class="card-base flex flex-col h-[calc(100vh-500px)]">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          配额记录列表
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          共 {{ formatNumber(total) }} 条记录
        </p>
      </div>

      <div class="flex-1 overflow-hidden">
        <el-table
          :data="quotaLogs"
          v-loading="loading"
          stripe
          style="width: 100%"
          height="100%"
        >
        <el-table-column prop="id" label="ID" width="80" />
        
        <el-table-column label="用户" width="200">
          <template #default="{ row }">
            <div>
              <p class="font-medium">{{ row.user_email }}</p>
              <p class="text-xs text-gray-500">ID: {{ row.user_id }}</p>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getQuotaTypeColor(row.type)" size="small">
              {{ formatQuotaType(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="数量" width="100">
          <template #default="{ row }">
            <span :class="row.type === 'earn' ? 'text-green-600' : 'text-orange-600'">
              {{ row.type === 'earn' ? '+' : '-' }}{{ row.amount }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column label="来源" width="120">
          <template #default="{ row }">
            <div class="flex items-center">
              <font-awesome-icon 
                :icon="['fas', getQuotaSourceIcon(row.source)]" 
                class="mr-2 text-gray-500"
              />
              {{ formatQuotaSource(row.source) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="description" label="描述" min-width="200" />
        
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString('zh-CN') }}
          </template>
        </el-table-column>
        </el-table>
      </div>

      <!-- Pagination -->
      <div class="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-base {
  @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm;
}
</style>
