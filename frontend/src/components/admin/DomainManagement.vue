<script lang="ts" setup>
import AdminFilterBar from './AdminFilterBar.vue'
import AdminPagination from './AdminPagination.vue'
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  formatDomainStatus,
} from '@/api/admin'
import type { Domain, AdminDomainCreateData } from '@/api/admin'

const loading = ref(false)
const domains = ref<Domain[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const filters = reactive({ search: '', status: '' as '' | number })
const appliedFilters = reactive({ search: '', status: '' as '' | number })
const filteredDomains = computed(() =>
  domains.value.filter(
    (domain) =>
      domain.domain.toLowerCase().includes(appliedFilters.search.toLowerCase()) &&
      (appliedFilters.status === '' || domain.status === appliedFilters.status),
  ),
)
const visibleDomains = computed(() =>
  filteredDomains.value.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value,
  ),
)
watch(
  () => filteredDomains.value.length,
  (total) => {
    currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(total / pageSize.value)))
  },
)
const handleSearch = () => {
  Object.assign(appliedFilters, filters)
  currentPage.value = 1
}
const handleReset = () => {
  Object.assign(filters, { search: '', status: '' })
  handleSearch()
}

const createDialogVisible = ref(false)
const createForm = reactive<AdminDomainCreateData>({
  domain: '',
  status: 1,
})

const loadDomains = async () => {
  try {
    loading.value = true
    const response = await getDomains()
    if (response.success && response.data) {
      domains.value = response.data
    } else {
      ElMessage.error(response.error || '获取域名列表失败')
    }
  } catch (error) {
    console.error('获取域名列表失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '获取域名列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  createForm.domain = ''
  createForm.status = 1
  createDialogVisible.value = true
}

const handleSaveCreate = async () => {
  if (!createForm.domain.trim()) {
    ElMessage.error('请输入域名')
    return
  }

  // 域名格式验证 - 支持多级域名（如 json.edu.kg）
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
  if (!domainRegex.test(createForm.domain)) {
    ElMessage.error('请输入有效的域名格式')
    return
  }

  try {
    const response = await createDomain({
      ...createForm,
      domain: createForm.domain.trim().toLowerCase(),
    })
    if (response.success) {
      ElMessage.success('域名创建成功')
      createDialogVisible.value = false
      await loadDomains()
    } else {
      ElMessage.error(response.error || '域名创建失败')
    }
  } catch (error) {
    console.error('域名创建失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '域名创建失败')
  }
}

const handleToggleStatus = async (domain: Domain) => {
  const newStatus = domain.status === 1 ? 0 : 1
  const statusText = newStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(`确定要${statusText}域名 "${domain.domain}" 吗？`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await updateDomain(domain.id, newStatus)
    if (response.success) {
      ElMessage.success(`域名${statusText}成功`)
      await loadDomains()
    } else {
      ElMessage.error(response.error || `域名${statusText}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`域名${statusText}失败:`, error)
      ElMessage.error(error instanceof Error ? error.message : `域名${statusText}失败`)
    }
  }
}

const handleDelete = async (domain: Domain) => {
  try {
    await ElMessageBox.confirm(
      `移除后，该域名将不再用于创建新邮箱；已有邮箱与历史邮件会保留。确定移除 “${domain.domain}” 吗？`,
      '移除可用域名',
      {
        confirmButtonText: '确认移除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await deleteDomain(domain.id)
    if (response.success) {
      ElMessage.success('域名已从可用列表移除')
      await loadDomains()
    } else {
      ElMessage.error(response.error || '域名删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('域名删除失败:', error)
      ElMessage.error(error instanceof Error ? error.message : '域名删除失败')
    }
  }
}

onMounted(() => {
  loadDomains()
})
</script>

<template>
  <div class="admin-module">
    <div class="admin-toolbar">
      <el-button type="primary" @click="handleCreate"
        ><font-awesome-icon icon="plus" />添加域名</el-button
      >
    </div>
    <AdminFilterBar :loading="loading" @search="handleSearch" @reset="handleReset">
      <el-form-item label="域名"
        ><el-input v-model="filters.search" placeholder="搜索域名" clearable
      /></el-form-item>
      <el-form-item label="状态"
        ><el-select v-model="filters.status" placeholder="全部状态" clearable
          ><el-option label="启用" :value="1" /><el-option label="禁用" :value="0" /></el-select
      ></el-form-item>
    </AdminFilterBar>

    <!-- 域名列表 -->
    <div class="admin-table-card">
      <el-table :data="visibleDomains" v-loading="loading" :max-height="640" class="w-full">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="domain" label="域名" min-width="200">
          <template #default="{ row }">
            <div class="flex items-center">
              <font-awesome-icon icon="globe" class="mr-2 text-gray-500" />
              <span class="font-mono">{{ row.domain }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ formatDomainStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ new Date(row.created_at).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="flex space-x-2">
              <el-button
                :type="row.status === 1 ? 'warning' : 'success'"
                size="small"
                text
                @click="handleToggleStatus(row)"
              >
                <font-awesome-icon :icon="row.status === 1 ? 'pause' : 'play'" class="mr-1" />
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                text
                @click="handleDelete(row)"
                aria-label="删除域名"
                title="删除域名"
              >
                <font-awesome-icon icon="trash" />
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <AdminPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredDomains.length"
      />
    </div>

    <!-- 创建域名对话框 -->
    <el-dialog class="admin-dialog" v-model="createDialogVisible" title="添加域名" width="500px">
      <el-form :model="createForm" label-width="80px" label-position="left">
        <el-form-item label="域名" required>
          <el-input v-model="createForm.domain" placeholder="例如: example.com" clearable>
            <template #prefix>
              <font-awesome-icon icon="globe" />
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="createForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="createDialogVisible = false"> 取消 </el-button>
          <el-button type="primary" @click="handleSaveCreate"> 添加 </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
