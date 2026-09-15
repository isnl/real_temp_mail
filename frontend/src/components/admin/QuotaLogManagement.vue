<script lang="ts" setup>
import AdminMetricCard from './AdminMetricCard.vue'
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { apiClient } from '@/api/request'
import {
  formatQuotaSource,
  formatQuotaType,
  getQuotaTypeColor,
  getQuotaSourceIcon,
} from '@/api/quota'
import type { PaginatedResponse } from '@/types'

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
  endDate: '',
})

const loadQuotaLogs = async () => {
  try {
    loading.value = true
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString(),
    })

    if (searchForm.userId) params.append('userId', searchForm.userId)
    if (searchForm.type) params.append('type', searchForm.type)
    if (searchForm.source) params.append('source', searchForm.source)
    if (searchForm.startDate) params.append('startDate', searchForm.startDate)
    if (searchForm.endDate) params.append('endDate', searchForm.endDate)

    const response = await apiClient.get<PaginatedResponse<QuotaLogWithUser>>(
      `/api/admin/quota-logs?${params}`,
    )
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
    endDate: '',
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
  <div class="admin-module">
    <!-- Header -->
    <div v-if="quotaStats" class="admin-metric-grid">
      <AdminMetricCard
        label="总获得"
        :value="quotaStats.totalEarned"
        icon="plus-circle"
        tone="success"
      />
      <AdminMetricCard
        label="总消费"
        :value="quotaStats.totalConsumed"
        icon="minus-circle"
        tone="warm"
      />
      <AdminMetricCard label="今日获得" :value="quotaStats.todayEarned" icon="calendar-day" />
      <AdminMetricCard
        label="今日消费"
        :value="quotaStats.todayConsumed"
        icon="calendar-minus"
        tone="neutral"
      />
    </div>

    <AdminFilterBar :loading="loading" @search="handleSearch" @reset="handleReset">
      <el-form-item label="用户 ID">
        <el-input v-model="searchForm.userId" placeholder="用户ID" clearable />
      </el-form-item>
      <el-form-item label="类型">
        <el-select v-model="searchForm.type" placeholder="类型" clearable>
          <el-option label="获得" value="earn" />
          <el-option label="消费" value="consume" />
        </el-select>
      </el-form-item>
      <el-form-item label="来源">
        <el-select v-model="searchForm.source" placeholder="来源" clearable>
          <el-option label="注册赠送" value="register" />
          <el-option label="历史签到奖励" value="checkin" />
          <el-option label="兑换码" value="redeem_code" />
          <el-option label="管理员调整" value="admin_adjust" />
          <el-option label="创建邮箱" value="create_email" />
        </el-select>
      </el-form-item>
      <el-form-item label="开始日期">
        <el-date-picker
          v-model="searchForm.startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker
          v-model="searchForm.endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
    </AdminFilterBar>

    <!-- Quota Logs Table -->
    <div class="admin-table-card">
      <div class="admin-table-body">
        <el-table :data="quotaLogs" v-loading="loading" style="width: 100%" :max-height="640">
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
      <AdminPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>
