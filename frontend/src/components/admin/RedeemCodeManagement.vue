<script lang="ts" setup>
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminActionsColumn from '@/components/admin/AdminActionsColumn.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getRedeemCodes,
  createRedeemCode,
  createBatchRedeemCodes,
  deleteRedeemCode,
} from '@/api/admin'
import type {
  AdminRedeemCodeDetails,
  AdminRedeemCodeCreateData,
  BatchRedeemCodeCreate,
  AdminRedeemCodeListParams,
  PaginatedResponse,
} from '@/api/admin'

const loading = ref(false)
const codes = ref<AdminRedeemCodeDetails[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const createDialogVisible = ref(false)
const batchCreateDialogVisible = ref(false)
const exportDialogVisible = ref(false)

// 最近创建的兑换码（用于创建后导出）
const recentlyCreatedCodes = ref<AdminRedeemCodeDetails[]>([])

// 筛选参数
const filters = reactive<AdminRedeemCodeListParams>({
  search: '',
  name: '',
  status: 'all',
  validityStatus: 'all',
  startDate: '',
  endDate: '',
})

// 导出配置
const exportConfig = reactive({
  includeCode: true,
  includeName: false,
  includeQuota: true,
  includeMaxUses: false,
  includeValidUntil: false,
  includeCreatedAt: false,
  separator: ' ', // 分隔符：空格、制表符、逗号
})

const createForm = reactive<AdminRedeemCodeCreateData>({
  name: '',
  quota: 5,
  validUntil: '',
  maxUses: 1,
  neverExpires: false,
})

const batchCreateForm = reactive<BatchRedeemCodeCreate>({
  name: '',
  quota: 5,
  validUntil: '',
  count: 10,
  prefix: '',
  maxUses: 1,
  neverExpires: false,
})

const loadCodes = async () => {
  try {
    loading.value = true

    const params: AdminRedeemCodeListParams = {
      page: currentPage.value,
      limit: pageSize.value,
      ...filters,
    }

    // 清理空值参数
    Object.keys(params).forEach((key) => {
      if (
        params[key as keyof AdminRedeemCodeListParams] === '' ||
        params[key as keyof AdminRedeemCodeListParams] === 'all'
      ) {
        delete params[key as keyof AdminRedeemCodeListParams]
      }
    })

    const response = await getRedeemCodes(params)
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

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadCodes()
}

// 筛选相关方法
const handleSearch = () => {
  currentPage.value = 1
  loadCodes()
}

const handleResetFilters = () => {
  Object.assign(filters, {
    search: '',
    name: '',
    status: 'all',
    validityStatus: 'all',
    startDate: '',
    endDate: '',
  })
  currentPage.value = 1
  loadCodes()
}

const handleCreate = () => {
  createForm.name = ''
  createForm.quota = 5
  createForm.validUntil = getDefaultValidUntil()
  createForm.maxUses = 1
  createForm.neverExpires = false
  createDialogVisible.value = true
}

const handleBatchCreate = () => {
  batchCreateForm.name = ''
  batchCreateForm.quota = 5
  batchCreateForm.validUntil = getDefaultValidUntil()
  batchCreateForm.count = 10
  batchCreateForm.prefix = ''
  batchCreateForm.maxUses = 1
  batchCreateForm.neverExpires = false
  batchCreateDialogVisible.value = true
}

const handleSaveCreate = async () => {
  if (!createForm.neverExpires && !createForm.validUntil) {
    ElMessage.error('请选择有效期或勾选永不过期')
    return
  }

  if (createForm.quota <= 0) {
    ElMessage.error('配额必须大于0')
    return
  }

  try {
    const response = await createRedeemCode({
      ...createForm,
      validUntil: createForm.neverExpires ? '' : toUtcISOString(createForm.validUntil),
    })
    if (response.success) {
      ElMessage.success('兑换码创建成功')
      createDialogVisible.value = false

      // 保存创建的兑换码用于导出
      recentlyCreatedCodes.value = [response.data!]

      // 询问是否导出
      ElMessageBox.confirm('兑换码创建成功！是否立即导出为TXT文件？', '导出确认', {
        confirmButtonText: '导出',
        cancelButtonText: '稍后',
        type: 'success',
      })
        .then(() => {
          exportDialogVisible.value = true
        })
        .catch(() => {
          // 用户选择稍后，清空临时数据
          recentlyCreatedCodes.value = []
        })

      loadCodes()
    } else {
      ElMessage.error(response.error || '兑换码创建失败')
    }
  } catch (error) {
    console.error('兑换码创建失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '兑换码创建失败')
  }
}

const handleSaveBatchCreate = async () => {
  if (!batchCreateForm.neverExpires && !batchCreateForm.validUntil) {
    ElMessage.error('请选择有效期或勾选永不过期')
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
    const response = await createBatchRedeemCodes({
      ...batchCreateForm,
      validUntil: batchCreateForm.neverExpires ? '' : toUtcISOString(batchCreateForm.validUntil),
    })
    if (response.success) {
      ElMessage.success(`成功创建${response.data!.length}个兑换码`)
      batchCreateDialogVisible.value = false

      // 保存创建的兑换码用于导出
      recentlyCreatedCodes.value = response.data!

      // 询问是否导出
      ElMessageBox.confirm(
        `成功创建${response.data!.length}个兑换码！是否立即导出为TXT文件？`,
        '导出确认',
        {
          confirmButtonText: '导出',
          cancelButtonText: '稍后',
          type: 'success',
        },
      )
        .then(() => {
          exportDialogVisible.value = true
        })
        .catch(() => {
          // 用户选择稍后，清空临时数据
          recentlyCreatedCodes.value = []
        })

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
    await ElMessageBox.confirm(`确定要删除兑换码 "${code.code}" 吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

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
  } catch {
    ElMessage.error('复制失败')
  }
}

// 导出兑换码为TXT文件
const exportCodes = (codesToExport: AdminRedeemCodeDetails[]) => {
  if (codesToExport.length === 0) {
    ElMessage.warning('没有可导出的兑换码')
    return
  }

  const lines: string[] = []

  codesToExport.forEach((code) => {
    const fields: string[] = []

    if (exportConfig.includeCode) {
      fields.push(code.code)
    }
    if (exportConfig.includeName) {
      fields.push(code.name || '无名称')
    }
    if (exportConfig.includeQuota) {
      fields.push(code.quota.toString())
    }
    if (exportConfig.includeMaxUses) {
      fields.push(code.max_uses.toString())
    }
    if (exportConfig.includeValidUntil) {
      fields.push(code.never_expires ? '永不过期' : new Date(code.valid_until).toLocaleString())
    }
    if (exportConfig.includeCreatedAt) {
      fields.push(new Date(code.created_at).toLocaleString())
    }

    lines.push(fields.join(exportConfig.separator))
  })

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `兑换码_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success(`成功导出${codesToExport.length}个兑换码`)
  exportDialogVisible.value = false
  recentlyCreatedCodes.value = []
}

// 导出当前列表中的兑换码
const handleExportCurrentList = () => {
  recentlyCreatedCodes.value = codes.value
  exportDialogVisible.value = true
}

// 检查是否选择了字段
const hasSelectedFields = computed(() => {
  return (
    exportConfig.includeCode ||
    exportConfig.includeName ||
    exportConfig.includeQuota ||
    exportConfig.includeMaxUses ||
    exportConfig.includeValidUntil ||
    exportConfig.includeCreatedAt
  )
})

// 获取预览行
const getPreviewLine = () => {
  if (recentlyCreatedCodes.value.length === 0) return ''

  const code = recentlyCreatedCodes.value[0]
  const fields: string[] = []

  if (exportConfig.includeCode) {
    fields.push(code.code || 'EXAMPLE123')
  }
  if (exportConfig.includeName) {
    fields.push(code.name || '示例名称')
  }
  if (exportConfig.includeQuota) {
    fields.push((code.quota || 5).toString())
  }
  if (exportConfig.includeMaxUses) {
    fields.push((code.max_uses || 1).toString())
  }
  if (exportConfig.includeValidUntil) {
    fields.push(code.never_expires ? '永不过期' : '2024-12-31 23:59:59')
  }
  if (exportConfig.includeCreatedAt) {
    fields.push('2024-01-01 12:00:00')
  }

  return fields.join(exportConfig.separator)
}

const formatLocalDateTime = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

const getDefaultValidUntil = (): string => {
  const date = new Date()
  date.setDate(date.getDate() + 30) // 默认30天后过期
  return formatLocalDateTime(date)
}

const toUtcISOString = (localDateTime: string): string => {
  const date = new Date(localDateTime.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) throw new Error('兑换码有效期无效')
  return date.toISOString()
}

// 获取兑换码状态类型
const getStatusType = (code: AdminRedeemCodeDetails): string => {
  const now = new Date()
  const validUntil = new Date(code.valid_until)
  const currentUses = code.currentUses || 0

  // 检查是否过期（永不过期的兑换码不会过期）
  if (!code.never_expires && validUntil < now) {
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

  // 检查是否过期（永不过期的兑换码不会过期）
  if (!code.never_expires && validUntil < now) {
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

const rowActions = (row: AdminRedeemCodeDetails) => [
  { label: '删除', danger: true, disabled: row.used, run: () => handleDelete(row) },
]
const rowLabel = (row: AdminRedeemCodeDetails) => row.code

onMounted(() => {
  loadCodes()
  // 设置默认有效期
  createForm.validUntil = getDefaultValidUntil()
  batchCreateForm.validUntil = getDefaultValidUntil()
})
</script>

<template>
  <div class="admin-module">
    <!-- 操作栏 -->
    <div class="admin-toolbar">
      <div class="flex space-x-2">
        <el-button type="primary" @click="handleCreate">
          <font-awesome-icon icon="plus" class="mr-2" />
          创建兑换码
        </el-button>
        <el-button class="admin-toolbar-secondary" @click="handleBatchCreate">
          <font-awesome-icon icon="layer-group" class="mr-2" />
          批量创建
        </el-button>
        <el-button
          class="admin-toolbar-secondary"
          @click="handleExportCurrentList"
          :disabled="codes.length === 0"
        >
          <font-awesome-icon icon="download" class="mr-2" />
          导出列表
        </el-button>
        <el-dropdown
          trigger="click"
          placement="bottom-end"
          class="admin-toolbar-overflow"
          popper-class="admin-actions-menu"
        >
          <button type="button" class="admin-more-button" aria-label="更多列表操作">
            <font-awesome-icon icon="ellipsis" />
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleBatchCreate">批量创建</el-dropdown-item>
              <el-dropdown-item :disabled="codes.length === 0" @click="handleExportCurrentList"
                >导出列表</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="admin-table-card">
      <AdminFilterBar
        :filters="filters"
        :loading="loading"
        @search="handleSearch"
        @reset="handleResetFilters"
      >
        <el-form-item label="兑换码">
          <el-input v-model="filters.search" placeholder="搜索兑换码" clearable>
            <template #prefix>
              <font-awesome-icon icon="search" class="text-gray-400" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="名称" class="admin-filter-wide">
          <el-input v-model="filters.name" placeholder="按名称筛选" clearable>
            <template #prefix>
              <font-awesome-icon icon="tag" class="text-gray-400" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="使用状态">
          <el-select v-model="filters.status" placeholder="使用状态">
            <el-option label="全部状态" value="all" />
            <el-option label="未使用" value="unused" />
            <el-option label="已使用" value="used" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="有效期状态">
          <el-select v-model="filters.validityStatus" placeholder="有效期状态">
            <el-option label="全部" value="all" />
            <el-option label="有效" value="valid" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker
            v-model="filters.startDate"
            type="date"
            placeholder="创建开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker
            v-model="filters.endDate"
            type="date"
            placeholder="创建结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
      </AdminFilterBar>

      <!-- 兑换码列表 -->
      <div class="admin-table-body">
        <el-table :data="codes" v-loading="loading" class="w-full" :max-height="640">
          <el-table-column label="兑换码" min-width="150">
            <template #default="{ row }">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-sm font-semibold">{{ row.code }}</span>
                <el-button
                  type="text"
                  size="small"
                  text
                  @click="copyToClipboard(row.code)"
                  class="text-primary-500 hover:text-primary-600"
                >
                  <font-awesome-icon icon="copy" />
                </el-button>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="名称" min-width="120">
            <template #default="{ row }">
              <span v-if="row.name" class="text-sm">{{ row.name }}</span>
              <span v-else class="text-sm text-gray-400">无名称</span>
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
              <el-tag :type="getStatusType(row)" size="small">
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
              <span v-if="row.never_expires" class="text-sm text-green-600 font-medium">
                永不过期
              </span>
              <span v-else class="text-sm">
                {{ new Date(row.valid_until).toLocaleString() }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.created_at).toLocaleString() }}
            </template>
          </el-table-column>
          <AdminActionsColumn :actions="rowActions" :row-label="rowLabel" :width="100" />
        </el-table>
      </div>

      <!-- 分页 -->
      <AdminPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </div>

    <!-- 创建兑换码对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建兑换码"
      width="600px"
      class="admin-dialog create-dialog"
    >
      <el-form :model="createForm" label-width="100px" label-position="left" class="create-form">
        <el-form-item label="名称" class="form-item-enhanced">
          <el-input
            v-model="createForm.name"
            placeholder="可选，兑换码名称"
            maxlength="50"
            clearable
            size="large"
          />
        </el-form-item>

        <div class="grid grid-cols-2 gap-6">
          <el-form-item label="配额" required class="form-item-enhanced">
            <el-input-number
              v-model="createForm.quota"
              :min="1"
              :max="100"
              controls-position="right"
              class="w-full"
              size="large"
            />
          </el-form-item>

          <el-form-item label="使用次数" required class="form-item-enhanced">
            <el-input-number
              v-model="createForm.maxUses"
              :min="1"
              :max="1000"
              controls-position="right"
              class="w-full"
              size="large"
            />
          </el-form-item>
        </div>

        <el-form-item label="有效期" required class="form-item-enhanced">
          <el-date-picker
            v-model="createForm.validUntil"
            type="datetime"
            placeholder="选择有效期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
            size="large"
            :disabled="createForm.neverExpires"
          />
          <div class="mt-3">
            <el-checkbox v-model="createForm.neverExpires" size="large">
              <span class="font-medium">永不过期</span>
            </el-checkbox>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end space-x-3 pt-4">
          <el-button @click="createDialogVisible = false" size="large"> 取消 </el-button>
          <el-button type="primary" @click="handleSaveCreate" size="large" class="px-8">
            <font-awesome-icon icon="plus" class="mr-2" />
            创建兑换码
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量创建兑换码对话框 -->
    <el-dialog
      v-model="batchCreateDialogVisible"
      title="批量创建兑换码"
      width="700px"
      class="admin-dialog batch-create-dialog"
    >
      <el-form
        :model="batchCreateForm"
        label-width="100px"
        label-position="left"
        class="batch-create-form"
      >
        <el-form-item label="名称" class="form-item-enhanced">
          <el-input
            v-model="batchCreateForm.name"
            placeholder="可选，兑换码名称"
            maxlength="50"
            clearable
            size="large"
          />
        </el-form-item>

        <div class="grid grid-cols-2 gap-6">
          <el-form-item label="配额" required class="form-item-enhanced">
            <el-input-number
              v-model="batchCreateForm.quota"
              :min="1"
              :max="100"
              controls-position="right"
              class="w-full"
              size="large"
            />
          </el-form-item>

          <el-form-item label="使用次数" required class="form-item-enhanced">
            <el-input-number
              v-model="batchCreateForm.maxUses"
              :min="1"
              :max="1000"
              controls-position="right"
              class="w-full"
              size="large"
            />
          </el-form-item>

          <el-form-item label="创建数量" required class="form-item-enhanced">
            <el-input-number
              v-model="batchCreateForm.count"
              :min="1"
              :max="100"
              controls-position="right"
              class="w-full"
              size="large"
            />
          </el-form-item>

          <el-form-item label="兑换码前缀" class="form-item-enhanced">
            <el-input
              v-model="batchCreateForm.prefix"
              placeholder="可选，兑换码前缀"
              maxlength="4"
              clearable
              size="large"
            />
          </el-form-item>
        </div>

        <el-form-item label="有效期" required class="form-item-enhanced">
          <el-date-picker
            v-model="batchCreateForm.validUntil"
            type="datetime"
            placeholder="选择有效期"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            class="w-full"
            size="large"
            :disabled="batchCreateForm.neverExpires"
          />
          <div class="mt-3">
            <el-checkbox v-model="batchCreateForm.neverExpires" size="large">
              <span class="font-medium">永不过期</span>
            </el-checkbox>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end space-x-3 pt-4">
          <el-button @click="batchCreateDialogVisible = false" size="large"> 取消 </el-button>
          <el-button type="primary" @click="handleSaveBatchCreate" size="large" class="px-8">
            <font-awesome-icon icon="layer-group" class="mr-2" />
            批量创建
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导出配置对话框 -->
    <el-dialog
      v-model="exportDialogVisible"
      title="导出兑换码"
      width="600px"
      class="admin-dialog export-dialog"
    >
      <div class="space-y-6">
        <div>
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">选择导出字段</h4>
          <div class="grid grid-cols-2 gap-4">
            <el-checkbox v-model="exportConfig.includeCode" size="large">
              <span class="font-medium">兑换码</span>
            </el-checkbox>
            <el-checkbox v-model="exportConfig.includeName" size="large">
              <span class="font-medium">名称</span>
            </el-checkbox>
            <el-checkbox v-model="exportConfig.includeQuota" size="large">
              <span class="font-medium">配额</span>
            </el-checkbox>
            <el-checkbox v-model="exportConfig.includeMaxUses" size="large">
              <span class="font-medium">使用次数</span>
            </el-checkbox>
            <el-checkbox v-model="exportConfig.includeValidUntil" size="large">
              <span class="font-medium">有效期</span>
            </el-checkbox>
            <el-checkbox v-model="exportConfig.includeCreatedAt" size="large">
              <span class="font-medium">创建时间</span>
            </el-checkbox>
          </div>
        </div>

        <div>
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">分隔符</h4>
          <el-radio-group v-model="exportConfig.separator" size="large">
            <el-radio label=" ">空格</el-radio>
            <el-radio label="	">制表符</el-radio>
            <el-radio label=",">逗号</el-radio>
            <el-radio label="|">竖线</el-radio>
          </el-radio-group>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">预览格式：</h5>
          <div class="font-mono text-sm text-gray-600 dark:text-gray-400">
            <template v-if="recentlyCreatedCodes.length > 0">
              {{ getPreviewLine() }}
            </template>
            <span v-else>请选择至少一个字段</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3 pt-4">
          <el-button @click="exportDialogVisible = false" size="large"> 取消 </el-button>
          <el-button
            type="primary"
            @click="exportCodes(recentlyCreatedCodes)"
            size="large"
            class="px-8"
            :disabled="!hasSelectedFields"
          >
            <font-awesome-icon icon="download" class="mr-2" />
            导出TXT文件
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 表单样式优化 */
.create-dialog :deep(.el-dialog__body) {
  padding: 20px 30px;
}

.batch-create-dialog :deep(.el-dialog__body) {
  padding: 20px 30px;
}

.export-dialog :deep(.el-dialog__body) {
  padding: 20px 30px;
}

.form-item-enhanced {
  margin-bottom: 24px;
}

.form-item-enhanced :deep(.el-form-item__label) {
  font-weight: 600;
  color: #374151;
  line-height: 1.5;
}

.dark .form-item-enhanced :deep(.el-form-item__label) {
  color: #f3f4f6;
}

.create-form :deep(.el-input-number),
.batch-create-form :deep(.el-input-number) {
  width: 100%;
}

.create-form :deep(.el-input-number .el-input__inner),
.batch-create-form :deep(.el-input-number .el-input__inner) {
  text-align: left;
}

.create-form :deep(.el-date-editor),
.batch-create-form :deep(.el-date-editor) {
  width: 100%;
}

/* 复选框和单选框样式 */
:deep(.el-checkbox__label),
:deep(.el-radio__label) {
  font-weight: 500;
}

/* 对话框标题样式 */
:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
}

/* 按钮样式 */
:deep(.el-button--large) {
  padding: 12px 24px;
  font-weight: 500;
}
</style>
