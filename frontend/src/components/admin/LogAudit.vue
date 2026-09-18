<script lang="ts" setup>
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getLogs, getLogActions } from '@/api/admin'
import type { AdminLogDetails, AdminLogListParams, PaginatedResponse } from '@/api/admin'

const loading = ref(false)
const logs = ref<AdminLogDetails[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const actions = ref<string[]>([])

const searchForm = reactive<AdminLogListParams>({
  search: '',
  action: '',
  startDate: '',
  endDate: '',
})

const loadLogs = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: currentPage.value,
      limit: pageSize.value,
    }

    // 清空搜索参数中的空值
    Object.keys(params).forEach((key) => {
      if (
        params[key as keyof typeof params] === '' ||
        params[key as keyof typeof params] === null
      ) {
        delete params[key as keyof typeof params]
      }
    })

    const response = await getLogs(params)
    if (response.success && response.data) {
      const data = response.data as PaginatedResponse<AdminLogDetails>
      logs.value = data.data || []
      total.value = data.total || 0
    } else {
      logs.value = []
      total.value = 0
      ElMessage.error(response.error || '获取日志列表失败')
    }
  } catch (error) {
    console.error('获取日志列表失败:', error)
    logs.value = []
    total.value = 0
    ElMessage.error('网络错误，获取日志列表失败')
  } finally {
    loading.value = false
  }
}

const loadActions = async () => {
  try {
    const response = await getLogActions()
    if (response.success) {
      actions.value = response.data!
    }
  } catch (error) {
    console.error('获取操作类型失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadLogs()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.action = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  currentPage.value = 1
  loadLogs()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadLogs()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadLogs()
}

const getActionColor = (action: string): string => {
  const actionColors: Record<string, string> = {
    LOGIN: 'success',
    LOGOUT: 'info',
    REGISTER: 'primary',
    CREATE_EMAIL: 'warning',
    DELETE_EMAIL: 'danger',
    REDEEM_CODE: 'success',
    ADMIN_ACTION: 'danger',
  }
  return actionColors[action] || 'info'
}

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    LOGIN: '登录',
    LOGOUT: '登出',
    REGISTER: '注册',
    CREATE_EMAIL: '创建邮箱',
    DELETE_EMAIL: '删除邮箱',
    REDEEM_CODE: '兑换码使用',
    ADMIN_ACTION: '管理员操作',
  }
  return actionMap[action] || action
}

const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

onMounted(() => {
  loadLogs()
  loadActions()
})
</script>

<template>
  <div class="admin-module">
    <div class="admin-table-card">
      <AdminFilterBar :loading="loading" @search="handleSearch" @reset="handleReset">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.search" placeholder="搜索用户邮箱或IP地址" clearable>
            <template #prefix>
              <font-awesome-icon icon="search" class="text-gray-400" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.action" placeholder="选择操作类型" clearable class="w-full">
            <el-option
              v-for="action in actions"
              :key="action"
              :label="formatAction(action)"
              :value="action"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="searchForm.startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="searchForm.endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            clearable
            class="w-full"
          />
        </el-form-item>
      </AdminFilterBar>

      <!-- 日志列表 -->
      <div class="admin-table-body">
        <el-table :data="logs" v-loading="loading" class="w-full" :max-height="640">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="180">
            <template #default="{ row }">
              <div v-if="row.userEmail" class="flex items-center">
                <font-awesome-icon icon="user" class="mr-2 text-gray-500 text-xs" />
                <span class="text-sm font-medium">{{ row.userEmail }}</span>
              </div>
              <span v-else class="text-gray-400 text-sm italic">系统操作</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-tag :type="getActionColor(row.action)" size="small">
                {{ formatAction(row.action) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="IP地址" width="160">
            <template #default="{ row }">
              <div v-if="row.ip_address" class="flex items-center">
                <font-awesome-icon icon="globe" class="mr-2 text-gray-500 text-xs" />
                <span class="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{{
                  row.ip_address
                }}</span>
              </div>
              <span v-else class="text-gray-400 text-sm">-</span>
            </template>
          </el-table-column>
          <el-table-column label="用户代理" min-width="250">
            <template #default="{ row }">
              <div
                v-if="row.user_agent"
                class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed"
              >
                <el-tooltip :content="row.user_agent" placement="top" :show-after="500">
                  <span class="cursor-help">{{ truncateText(row.user_agent, 60) }}</span>
                </el-tooltip>
              </div>
              <span v-else class="text-gray-400 text-sm">-</span>
            </template>
          </el-table-column>
          <el-table-column label="详情" min-width="220">
            <template #default="{ row }">
              <div v-if="row.details" class="text-sm">
                <el-tooltip :content="row.details" placement="top" :show-after="500">
                  <span class="cursor-help text-gray-700 dark:text-gray-300">{{
                    truncateText(row.details, 45)
                  }}</span>
                </el-tooltip>
              </div>
              <span v-else class="text-gray-400 text-sm">-</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="180">
            <template #default="{ row }">
              <div class="text-sm">
                <div class="font-medium">{{ new Date(row.timestamp).toLocaleDateString() }}</div>
                <div class="text-xs text-gray-500">
                  {{ new Date(row.timestamp).toLocaleTimeString() }}
                </div>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <AdminPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 空状态 -->
  </div>
</template>
