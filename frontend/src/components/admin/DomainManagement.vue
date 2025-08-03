<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  getDomains, 
  createDomain, 
  updateDomain, 
  deleteDomain,
  formatDomainStatus
} from '@/api/admin'
import type { Domain, AdminDomainCreateData } from '@/api/admin'

const loading = ref(false)
const domains = ref<Domain[]>([])

const createDialogVisible = ref(false)
const createForm = reactive<AdminDomainCreateData>({
  domain: '',
  status: 1
})

const loadDomains = async () => {
  try {
    loading.value = true
    const response = await getDomains()
    if (response.success) {
      domains.value = response.data!
    } else {
      ElMessage.error(response.error || '获取域名列表失败')
    }
  } catch (error) {
    console.error('获取域名列表失败:', error)
    ElMessage.error('获取域名列表失败')
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
  
  // 简单的域名格式验证
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
  if (!domainRegex.test(createForm.domain)) {
    ElMessage.error('请输入有效的域名格式')
    return
  }
  
  try {
    const response = await createDomain(createForm)
    if (response.success) {
      ElMessage.success('域名创建成功')
      createDialogVisible.value = false
      loadDomains()
    } else {
      ElMessage.error(response.error || '域名创建失败')
    }
  } catch (error) {
    console.error('域名创建失败:', error)
    ElMessage.error('域名创建失败')
  }
}

const handleToggleStatus = async (domain: Domain) => {
  const newStatus = domain.status === 1 ? 0 : 1
  const statusText = newStatus === 1 ? '启用' : '禁用'
  
  try {
    await ElMessageBox.confirm(
      `确定要${statusText}域名 "${domain.domain}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await updateDomain(domain.id, newStatus)
    if (response.success) {
      ElMessage.success(`域名${statusText}成功`)
      loadDomains()
    } else {
      ElMessage.error(response.error || `域名${statusText}失败`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`域名${statusText}失败:`, error)
      ElMessage.error(`域名${statusText}失败`)
    }
  }
}

const handleDelete = async (domain: Domain) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除域名 "${domain.domain}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await deleteDomain(domain.id)
    if (response.success) {
      ElMessage.success('域名删除成功')
      loadDomains()
    } else {
      ElMessage.error(response.error || '域名删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('域名删除失败:', error)
      ElMessage.error('域名删除失败')
    }
  }
}

onMounted(() => {
  loadDomains()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- 操作栏 -->
    <div class="flex justify-between items-center">
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex-1 mr-4">
        <p class="text-sm text-blue-700 dark:text-blue-400">
          管理系统支持的邮箱域名，用户可以选择这些域名创建临时邮箱
        </p>
      </div>
      <div class="flex space-x-2">
        <el-button type="primary" @click="handleCreate" class="btn-primary">
          <font-awesome-icon icon="plus" class="mr-2" />
          添加域名
        </el-button>
        <el-button @click="loadDomains" :loading="loading">
          <font-awesome-icon icon="refresh" class="mr-2" />
          刷新
        </el-button>
      </div>
    </div>

    <!-- 域名列表 -->
    <div class="card-base">
      <el-table
        :data="domains"
        :loading="loading"
        stripe
        class="w-full"
      >
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
                @click="handleToggleStatus(row)"
              >
                <font-awesome-icon 
                  :icon="row.status === 1 ? 'pause' : 'play'" 
                  class="mr-1"
                />
                {{ row.status === 1 ? '禁用' : '启用' }}
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
      
      <div v-if="domains.length === 0 && !loading" class="text-center py-12">
        <font-awesome-icon 
          icon="globe" 
          class="text-4xl text-gray-400 dark:text-gray-600 mb-4"
        />
        <p class="text-gray-600 dark:text-gray-400">暂无域名</p>
        <el-button type="primary" @click="handleCreate" class="mt-4">
          添加第一个域名
        </el-button>
      </div>
    </div>

    <!-- 创建域名对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="添加域名"
      width="500px"
    >
      <el-form
        :model="createForm"
        label-width="80px"
        label-position="left"
      >
        <el-form-item label="域名" required>
          <el-input
            v-model="createForm.domain"
            placeholder="例如: example.com"
            clearable
          >
            <template #prefix>
              <font-awesome-icon icon="globe" />
            </template>
          </el-input>
          <div class="text-xs text-gray-500 mt-1">
            请输入完整的域名，例如: example.com
          </div>
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
          <el-button @click="createDialogVisible = false">
            取消
          </el-button>
          <el-button type="primary" @click="handleSaveCreate">
            添加
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
