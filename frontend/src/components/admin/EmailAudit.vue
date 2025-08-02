<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getEmails, 
  deleteEmail,
  formatNumber
} from '@/api/admin'
import type { 
  AdminEmailDetails, 
  AdminEmailListParams,
  PaginatedResponse 
} from '@/api/admin'

const loading = ref(false)
const emails = ref<AdminEmailDetails[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = reactive<AdminEmailListParams>({
  search: '',
  sender: '',
  startDate: '',
  endDate: ''
})

const emailDetailVisible = ref(false)
const selectedEmail = ref<AdminEmailDetails | null>(null)

const loadEmails = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: currentPage.value,
      limit: pageSize.value
    }
    
    const response = await getEmails(params)
    if (response.success) {
      const data = response.data as PaginatedResponse<AdminEmailDetails>
      emails.value = data.data
      total.value = data.total
    } else {
      ElMessage.error(response.error || '获取邮件列表失败')
    }
  } catch (error) {
    console.error('获取邮件列表失败:', error)
    ElMessage.error('获取邮件列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadEmails()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.sender = ''
  searchForm.startDate = ''
  searchForm.endDate = ''
  currentPage.value = 1
  loadEmails()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadEmails()
}

const handleViewDetail = (email: AdminEmailDetails) => {
  selectedEmail.value = email
  emailDetailVisible.value = true
}

const handleDelete = async (email: AdminEmailDetails) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这封邮件吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await deleteEmail(email.id)
    if (response.success) {
      ElMessage.success('邮件删除成功')
      loadEmails()
    } else {
      ElMessage.error(response.error || '邮件删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('邮件删除失败:', error)
      ElMessage.error('邮件删除失败')
    }
  }
}

const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

onMounted(() => {
  loadEmails()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 搜索表单 -->
    <div class="card-base p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <el-input
          v-model="searchForm.search"
          placeholder="搜索主题或内容"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <font-awesome-icon icon="search" />
          </template>
        </el-input>
        
        <el-input
          v-model="searchForm.sender"
          placeholder="发件人"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <font-awesome-icon icon="user" />
          </template>
        </el-input>
        
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

    <!-- 邮件列表 -->
    <div class="card-base">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          邮件审查
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          共 {{ formatNumber(total) }} 封邮件
        </p>
      </div>
      
      <el-table
        :data="emails"
        :loading="loading"
        stripe
        class="w-full"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="临时邮箱" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center">
              <font-awesome-icon icon="envelope" class="mr-2 text-blue-500" />
              <span class="font-mono text-sm">{{ row.tempEmailAddress }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div class="flex items-center">
              <font-awesome-icon icon="user" class="mr-2 text-gray-500" />
              <span class="text-sm">{{ row.userEmail }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="发件人" min-width="150">
          <template #default="{ row }">
            <span class="text-sm">{{ truncateText(row.sender, 30) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="主题" min-width="200">
          <template #default="{ row }">
            <span class="text-sm">{{ truncateText(row.subject || '无主题', 40) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <div class="flex items-center space-x-2">
              <el-tag :type="row.is_read ? 'success' : 'warning'" size="small">
                {{ row.is_read ? '已读' : '未读' }}
              </el-tag>
              <font-awesome-icon 
                v-if="row.verification_code" 
                icon="key" 
                class="text-orange-500" 
                title="包含验证码"
              />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="接收时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.received_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="flex space-x-2">
              <el-button
                type="primary"
                size="small"
                @click="handleViewDetail(row)"
              >
                <font-awesome-icon icon="eye" />
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handleDelete(row)"
              >
                <font-awesome-icon icon="trash" />
              </el-button>
            </div>
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

    <!-- 邮件详情对话框 -->
    <el-dialog
      v-model="emailDetailVisible"
      title="邮件详情"
      width="800px"
      top="5vh"
    >
      <div v-if="selectedEmail" class="space-y-4">
        <!-- 邮件基本信息 -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">临时邮箱:</label>
            <p class="font-mono text-sm">{{ selectedEmail.tempEmailAddress }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">用户:</label>
            <p class="text-sm">{{ selectedEmail.userEmail }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">发件人:</label>
            <p class="text-sm">{{ selectedEmail.sender }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-400">接收时间:</label>
            <p class="text-sm">{{ new Date(selectedEmail.received_at).toLocaleString() }}</p>
          </div>
        </div>
        
        <!-- 主题 -->
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-400">主题:</label>
          <p class="text-sm mt-1">{{ selectedEmail.subject || '无主题' }}</p>
        </div>
        
        <!-- 验证码 -->
        <div v-if="selectedEmail.verification_code">
          <label class="text-sm font-medium text-gray-600 dark:text-gray-400">验证码:</label>
          <p class="text-lg font-mono font-bold text-orange-600 dark:text-orange-400 mt-1">
            {{ selectedEmail.verification_code }}
          </p>
        </div>
        
        <!-- 邮件内容 -->
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-400">内容:</label>
          <div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg">
            <!-- HTML内容 -->
            <div v-if="selectedEmail.html_content" class="p-4">
              <div class="text-xs text-gray-500 mb-2">HTML内容:</div>
              <div 
                class="prose prose-sm max-w-none dark:prose-invert"
                v-html="selectedEmail.html_content"
              ></div>
            </div>
            
            <!-- 纯文本内容 -->
            <div v-if="selectedEmail.content" class="p-4 border-t border-gray-200 dark:border-gray-700">
              <div class="text-xs text-gray-500 mb-2">纯文本内容:</div>
              <pre class="whitespace-pre-wrap text-sm">{{ selectedEmail.content }}</pre>
            </div>
            
            <div v-if="!selectedEmail.content && !selectedEmail.html_content" class="p-4 text-center text-gray-500">
              无邮件内容
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex justify-end">
          <el-button @click="emailDetailVisible = false">
            关闭
          </el-button>
        </div>
      </template>
    </el-dialog>
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
