<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getRedeemCodes,
  createRedeemCode,
  createBatchRedeemCodes,
  deleteRedeemCode,
  formatNumber
} from '@/api/admin'
import type { 
  AdminRedeemCodeDetails, 
  AdminRedeemCodeCreateData,
  BatchRedeemCodeCreate,
  PaginatedResponse 
} from '@/api/admin'

const loading = ref(false)
const codes = ref<AdminRedeemCodeDetails[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const createDialogVisible = ref(false)
const batchCreateDialogVisible = ref(false)

const createForm = reactive<AdminRedeemCodeCreateData>({
  quota: 5,
  validUntil: '',
  maxUses: 1
})

const batchCreateForm = reactive<BatchRedeemCodeCreate>({
  quota: 5,
  validUntil: '',
  count: 10,
  prefix: '',
  maxUses: 1
})

const loadCodes = async () => {
  try {
    loading.value = true
    const response = await getRedeemCodes(currentPage.value, pageSize.value)
    if (response.success) {
      const data = response.data as PaginatedResponse<AdminRedeemCodeDetails>
      codes.value = data.data
      total.value = data.total
    } else {
      ElMessage.error(response.error || '获取兑换码列表失败')
    }
  } catch (error) {
    console.error('获取兑换码列表失败:', error)
    ElMessage.error('获取兑换码列表失败')
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadCodes()
}

const handleCreate = () => {
  createForm.quota = 5
  createForm.validUntil = ''
  createForm.maxUses = 1
  createDialogVisible.value = true
}

const handleBatchCreate = () => {
  batchCreateForm.quota = 5
  batchCreateForm.validUntil = ''
  batchCreateForm.count = 10
  batchCreateForm.prefix = ''
  batchCreateForm.maxUses = 1
  batchCreateDialogVisible.value = true
}

const handleSaveCreate = async () => {
  if (!createForm.validUntil) {
    ElMessage.error('请选择有效期')
    return
  }
  
  if (createForm.quota <= 0) {
    ElMessage.error('配额必须大于0')
    return
  }
  
  try {
    const response = await createRedeemCode(createForm)
    if (response.success) {
      ElMessage.success('兑换码创建成功')
      createDialogVisible.value = false
      loadCodes()
    } else {
      ElMessage.error(response.error || '兑换码创建失败')
    }
  } catch (error) {
    console.error('兑换码创建失败:', error)
    ElMessage.error('兑换码创建失败')
  }
}

const handleSaveBatchCreate = async () => {
  if (!batchCreateForm.validUntil) {
    ElMessage.error('请选择有效期')
    return
  }
  
  if (batchCreateForm.quota <= 0) {
    ElMessage.error('配额必须大于0')
    return
  }
  
  if (batchCreateForm.count <= 0 || batchCreateForm.count > 100) {
    ElMessage.error('数量必须在1-100之间')
    return
  }
  
  try {
    const response = await createBatchRedeemCodes(batchCreateForm)
    if (response.success) {
      ElMessage.success(`成功创建${response.data!.length}个兑换码`)
      batchCreateDialogVisible.value = false
      loadCodes()
    } else {
      ElMessage.error(response.error || '批量创建兑换码失败')
    }
  } catch (error) {
    console.error('批量创建兑换码失败:', error)
    ElMessage.error('批量创建兑换码失败')
  }
}

const handleDelete = async (code: AdminRedeemCodeDetails) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除兑换码 "${code.code}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await deleteRedeemCode(code.code)
    if (response.success) {
      ElMessage.success('兑换码删除成功')
      loadCodes()
    } else {
      ElMessage.error(response.error || '兑换码删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('兑换码删除失败:', error)
      ElMessage.error('兑换码删除失败')
    }
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const getDefaultValidUntil = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + 30) // 默认30天后过期
  return date.toISOString().split('T')[0]
}

// 获取兑换码状态类型
const getStatusType = (code: AdminRedeemCodeDetails): string => {
  const now = new Date()
  const validUntil = new Date(code.valid_until)
  const currentUses = code.currentUses || 0

  if (validUntil < now) {
    return 'danger' // 已过期
  }

  if (currentUses >= code.max_uses) {
    return 'success' // 已用完
  }

  if (currentUses > 0) {
    return 'warning' // 部分使用
  }

  return 'info' // 未使用
}

// 获取兑换码状态文本
const getStatusText = (code: AdminRedeemCodeDetails): string => {
  const now = new Date()
  const validUntil = new Date(code.valid_until)
  const currentUses = code.currentUses || 0

  if (validUntil < now) {
    return '已过期'
  }

  if (currentUses >= code.max_uses) {
    return '已用完'
  }

  if (currentUses > 0) {
    return '部分使用'
  }

  return '未使用'
}

onMounted(() => {
  loadCodes()
  // 设置默认有效期
  createForm.validUntil = getDefaultValidUntil()
  batchCreateForm.validUntil = getDefaultValidUntil()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 操作栏 -->
    <div class="flex justify-between items-center">
      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex-1 mr-4">
        <p class="text-sm text-green-700 dark:text-green-400">
          管理系统兑换码，用户可通过兑换码获取配额
        </p>
      </div>
      <div class="flex space-x-2">
        <el-button type="primary" @click="handleCreate" class="btn-primary">
          <font-awesome-icon icon="plus" class="mr-2" />
          创建兑换码
        </el-button>
        <el-button type="success" @click="handleBatchCreate">
          <font-awesome-icon icon="layer-group" class="mr-2" />
          批量创建
        </el-button>
        <el-button @click="loadCodes" :loading="loading">
          <font-awesome-icon icon="refresh" class="mr-2" />
          刷新
        </el-button>
      </div>
    </div>

    <!-- 兑换码列表 -->
    <div class="card-base">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          兑换码列表
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          共 {{ formatNumber(total) }} 个兑换码
        </p>
      </div>
      
      <el-table
        :data="codes"
        :loading="loading"
        stripe
        class="w-full"
      >
        <el-table-column label="兑换码" min-width="150">
          <template #default="{ row }">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-sm font-semibold">{{ row.code }}</span>
              <el-button
                type="text"
                size="small"
                @click="copyToClipboard(row.code)"
                class="text-blue-500 hover:text-blue-600"
              >
                <font-awesome-icon icon="copy" />
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="quota" label="配额" width="80" />
        <el-table-column label="使用次数" width="120">
          <template #default="{ row }">
            <div class="text-sm">
              <span class="font-semibold">{{ row.currentUses || 0 }}</span>
              <span class="text-gray-500"> / {{ row.max_uses }}</span>
            </div>
            <div class="text-xs text-gray-400">
              {{ row.max_uses === 1 ? '单次使用' : '多次使用' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row)"
              size="small"
            >
              {{ getStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="使用记录" min-width="200">
          <template #default="{ row }">
            <div v-if="row.usageList && row.usageList.length > 0" class="space-y-1">
              <div
                v-for="(usage, index) in row.usageList.slice(0, 2)"
                :key="index"
                class="flex items-center text-sm"
              >
                <font-awesome-icon icon="user" class="mr-2 text-gray-500" />
                <span class="truncate">{{ usage.userEmail }}</span>
                <span class="text-xs text-gray-400 ml-2">
                  {{ new Date(usage.usedAt).toLocaleDateString() }}
                </span>
              </div>
              <div v-if="row.usageList.length > 2" class="text-xs text-gray-400">
                还有 {{ row.usageList.length - 2 }} 条记录...
              </div>
            </div>
            <span v-else class="text-gray-400 text-sm">未使用</span>
          </template>
        </el-table-column>
        <el-table-column label="使用时间" width="180">
          <template #default="{ row }">
            <span v-if="row.used_at" class="text-sm">
              {{ new Date(row.used_at).toLocaleString() }}
            </span>
            <span v-else class="text-gray-400 text-sm">-</span>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="180">
          <template #default="{ row }">
            <span class="text-sm">{{ new Date(row.valid_until).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
              :disabled="row.used"
            >
              <font-awesome-icon icon="trash" />
            </el-button>
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

    <!-- 创建兑换码对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建兑换码"
      width="500px"
    >
      <el-form
        :model="createForm"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="配额" required>
          <el-input-number
            v-model="createForm.quota"
            :min="1"
            :max="100"
            controls-position="right"
            class="w-full"
          />
          <div class="text-xs text-gray-500 mt-1">
            用户使用此兑换码可获得的配额数量
          </div>
        </el-form-item>

        <el-form-item label="使用次数" required>
          <el-input-number
            v-model="createForm.maxUses"
            :min="1"
            :max="1000"
            controls-position="right"
            class="w-full"
          />
          <div class="text-xs text-gray-500 mt-1">
            此兑换码最多可被使用的次数（每个用户只能使用一次）
          </div>
        </el-form-item>

        <el-form-item label="有效期" required>
          <el-date-picker
            v-model="createForm.validUntil"
            type="datetime"
            placeholder="选择有效期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="createDialogVisible = false">
            取消
          </el-button>
          <el-button type="primary" @click="handleSaveCreate">
            创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量创建兑换码对话框 -->
    <el-dialog
      v-model="batchCreateDialogVisible"
      title="批量创建兑换码"
      width="500px"
    >
      <el-form
        :model="batchCreateForm"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="配额" required>
          <el-input-number
            v-model="batchCreateForm.quota"
            :min="1"
            :max="100"
            controls-position="right"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="使用次数" required>
          <el-input-number
            v-model="batchCreateForm.maxUses"
            :min="1"
            :max="1000"
            controls-position="right"
            class="w-full"
          />
          <div class="text-xs text-gray-500 mt-1">
            每个兑换码最多可被使用的次数
          </div>
        </el-form-item>

        <el-form-item label="数量" required>
          <el-input-number
            v-model="batchCreateForm.count"
            :min="1"
            :max="100"
            controls-position="right"
            class="w-full"
          />
          <div class="text-xs text-gray-500 mt-1">
            一次最多创建100个兑换码
          </div>
        </el-form-item>

        <el-form-item label="前缀">
          <el-input
            v-model="batchCreateForm.prefix"
            placeholder="可选，兑换码前缀"
            maxlength="4"
            clearable
          />
          <div class="text-xs text-gray-500 mt-1">
            可选，最多4个字符的前缀
          </div>
        </el-form-item>
        
        <el-form-item label="有效期" required>
          <el-date-picker
            v-model="batchCreateForm.validUntil"
            type="datetime"
            placeholder="选择有效期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="batchCreateDialogVisible = false">
            取消
          </el-button>
          <el-button type="primary" @click="handleSaveBatchCreate">
            批量创建
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
