<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  getLogs, 
  getLogActions,
  formatNumber
} from '@/api/admin'
import type { 
  AdminLogDetails, 
  AdminLogListParams,
  PaginatedResponse 
} from '@/api/admin'

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
  endDate: ''
})

const loadLogs = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: currentPage.value,
      limit: pageSize.value
    }
    
    const response = await getLogs(params)
    if (response.success) {
      const data = response.data as PaginatedResponse<AdminLogDetails>
      logs.value = data.data
      total.value = data.total
    } else {
      ElMessage.error(response.error || '获取日志列表失败')
    }
  } catch (error) {
    console.error('获取日志列表失败:', error)
    ElMessage.error('获取日志列表失败')
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

const getActionColor = (action: string): string => {
  const actionColors: Record<string, string> = {
    'LOGIN': 'success',
    'LOGOUT': 'info',
    'REGISTER': 'primary',
    'CREATE_EMAIL': 'warning',
    'DELETE_EMAIL': 'danger',
    'REDEEM_CODE': 'success',
    'ADMIN_ACTION': 'danger'
  }
  return actionColors[action] || 'info'
}

const formatAction = (action: string): string => {
  const actionMap: Record<string, string> = {
    'LOGIN': '登录',
    'LOGOUT': '登出',
    'REGISTER': '注册',
    'CREATE_EMAIL': '创建邮箱',
    'DELETE_EMAIL': '删除邮箱',
    'REDEEM_CODE': '兑换码使用',
    'ADMIN_ACTION': '管理员操作'
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
  <div class="flex flex-col gap-6">
    <!-- 搜索表单 -->
    <div class="card-base p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <el-input
          v-model="searchForm.search"
          placeholder="搜索用户邮箱或IP"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <font-awesome-icon icon="search" />
          </template>
        </el-input>
        
        <el-select
          v-model="searchForm.action"
          placeholder="选择操作类型"
          clearable
        >
          <el-option
            v-for="action in actions"
            :key="action"
            :label="formatAction(action)"
            :value="action"
          />
        </el-select>
        
        <el-date-picker
          v-model="searchForm.startDate"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
        />
        
        <el-date-picker
          v-model="searchForm.endDate"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
        />
        
        <div class="flex space-x-2">
          <el-button type="primary" @click="handleSearch" class="btn-primary">
            <font-awesome-icon icon="search" class="mr-2" />
            搜索
          </el-button>
          <el-button @click="handleReset">
            <font-awesome-icon icon="refresh" class="mr-2" />
            重置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 日志列表 -->
    <div class="card-base">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          操作日志
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          共 {{ formatNumber(total) }} 条日志记录
        </p>
      </div>
      
      <el-table
        :data="logs"
        :loading="loading"
        stripe
        class="w-full"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div v-if="row.userEmail" class="flex items-center">
              <font-awesome-icon icon="user" class="mr-2 text-gray-500" />
              <span class="text-sm">{{ row.userEmail }}</span>
            </div>
            <span v-else class="text-gray-400 text-sm">系统操作</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-tag :type="getActionColor(row.action)" size="small">
              {{ formatAction(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="IP地址" width="140">
          <template #default="{ row }">
            <div v-if="row.ip_address" class="flex items-center">
              <font-awesome-icon icon="globe" class="mr-2 text-gray-500" />
              <span class="font-mono text-sm">{{ row.ip_address }}</span>
            </div>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>
        </el-table-column>
        <el-table-column label="用户代理" min-width="200">
          <template #default="{ row }">
            <span v-if="row.user_agent" class="text-xs text-gray-600 dark:text-gray-400">
              {{ truncateText(row.user_agent, 50) }}
            </span>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="200">
          <template #default="{ row }">
            <span v-if="row.details" class="text-sm">
              {{ truncateText(row.details, 40) }}
            </span>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.timestamp).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="p-6 border-t border-gray-200 dark:border-gray-700">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next, jumper"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="logs.length === 0 && !loading" class="card-base">
      <div class="text-center py-12">
        <font-awesome-icon 
          icon="file-alt" 
          class="text-4xl text-gray-400 dark:text-gray-600 mb-4"
        />
        <p class="text-gray-600 dark:text-gray-400">暂无日志记录</p>
      </div>
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
