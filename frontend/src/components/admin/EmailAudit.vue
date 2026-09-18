<script lang="ts" setup>
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminActionsColumn from '@/components/admin/AdminActionsColumn.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { computed, ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getEmailById, getEmails, deleteEmail } from '@/api/admin'
import { buildSandboxedEmailHtml } from '@/utils/safeEmailHtml'
import type {
  AdminEmailDetails,
  AdminEmailSummary,
  AdminEmailListParams,
  PaginatedResponse,
} from '@/api/admin'

const loading = ref(false)
const emails = ref<AdminEmailSummary[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = reactive<AdminEmailListParams>({
  search: '',
  sender: '',
  startDate: '',
  endDate: '',
})

const emailDetailVisible = ref(false)
const selectedEmail = ref<AdminEmailDetails | null>(null)
const detailLoading = ref(false)
let detailRequestId = 0
const sandboxedHtml = computed(() => buildSandboxedEmailHtml(selectedEmail.value?.html_content))

const loadEmails = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: currentPage.value,
      limit: pageSize.value,
    }

    const response = await getEmails(params)
    if (response.success) {
      const data = response.data as PaginatedResponse<AdminEmailSummary>
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

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadEmails()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadEmails()
}

const handleViewDetail = async (email: AdminEmailSummary) => {
  const requestId = ++detailRequestId
  selectedEmail.value = null
  emailDetailVisible.value = true
  detailLoading.value = true

  try {
    const response = await getEmailById(email.id)
    if (requestId !== detailRequestId || !emailDetailVisible.value) return
    if (!response.data) throw new Error(response.error || '邮件详情不存在')
    selectedEmail.value = response.data
  } catch (error) {
    if (requestId === detailRequestId) {
      ElMessage.error(error instanceof Error ? error.message : '获取邮件详情失败')
      emailDetailVisible.value = false
    }
  } finally {
    if (requestId === detailRequestId) detailLoading.value = false
  }
}

const handleDetailClosed = () => {
  detailRequestId += 1
  detailLoading.value = false
  selectedEmail.value = null
}

const handleDelete = async (email: AdminEmailSummary) => {
  try {
    await ElMessageBox.confirm(`确定要删除这封邮件吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

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

const rowActions = (row: AdminEmailSummary) => [
  { label: '查看', run: () => handleViewDetail(row) },
  { label: '删除', danger: true, run: () => handleDelete(row) },
]
const rowLabel = (row: AdminEmailSummary) => String(row.subject || row.id)

onMounted(() => {
  loadEmails()
})
</script>

<template>
  <div class="admin-module">
    <div class="admin-table-card">
      <AdminFilterBar
        :filters="searchForm"
        :loading="loading"
        @search="handleSearch"
        @reset="handleReset"
      >
        <el-form-item label="关键词">
          <el-input v-model="searchForm.search" placeholder="搜索主题或内容" clearable>
            <template #prefix>
              <font-awesome-icon icon="search" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="发件人" class="admin-filter-wide">
          <el-input v-model="searchForm.sender" placeholder="发件人" clearable>
            <template #prefix>
              <font-awesome-icon icon="user" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="searchForm.startDate"
            type="date"
            placeholder="开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="searchForm.endDate"
            type="date"
            placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
      </AdminFilterBar>

      <!-- 邮件列表 -->
      <div class="admin-table-body">
        <el-table :data="emails" v-loading="loading" class="w-full" :max-height="640">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="临时邮箱" min-width="180">
            <template #default="{ row }">
              <div class="flex items-center">
                <font-awesome-icon icon="envelope" class="mr-2 text-primary-500" />
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
              <el-tag :type="row.is_read ? 'success' : 'warning'" size="small">
                {{ row.is_read ? '已读' : '未读' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="接收时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.received_at).toLocaleString() }}
            </template>
          </el-table-column>
          <AdminActionsColumn :actions="rowActions" :row-label="rowLabel" :width="150" />
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

    <!-- 邮件详情对话框 -->
    <el-dialog
      class="admin-dialog"
      v-model="emailDetailVisible"
      title="邮件详情"
      width="800px"
      top="5vh"
      @closed="handleDetailClosed"
    >
      <div v-if="detailLoading" class="email-detail-skeleton" aria-label="正在加载邮件详情">
        <el-skeleton animated :rows="8" />
      </div>

      <div v-else-if="selectedEmail" class="flex flex-col gap-4">
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
              <iframe
                class="email-audit-frame"
                :srcdoc="sandboxedHtml"
                sandbox=""
                referrerpolicy="no-referrer"
                title="隔离的邮件 HTML 内容"
              />
            </div>

            <!-- 纯文本内容 -->
            <div
              v-if="selectedEmail.content"
              class="p-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div class="text-xs text-gray-500 mb-2">纯文本内容:</div>
              <pre class="whitespace-pre-wrap text-sm">{{ selectedEmail.content }}</pre>
            </div>

            <div
              v-if="!selectedEmail.content && !selectedEmail.html_content"
              class="p-4 text-center text-gray-500"
            >
              无邮件内容
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <el-button @click="emailDetailVisible = false"> 关闭 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.email-audit-frame {
  display: block;
  width: 100%;
  height: min(46vh, 420px);
  min-height: 280px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  background: #fff;
}

.email-detail-skeleton {
  min-height: 420px;
  padding: 8px 2px;
}
</style>
