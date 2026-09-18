<script lang="ts" setup>
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminActionsColumn from '@/components/admin/AdminActionsColumn.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getUsers,
  updateUser,
  deleteUser,
  formatUserStatus,
  formatUserRole,
  formatNumber,
} from '@/api/admin'
import { apiClient } from '@/api/request'
import type {
  AdminUserDetails,
  AdminUserListParams,
  AdminUserUpdateData,
  PaginatedResponse,
} from '@/api/admin'

const loading = ref(false)
const users = ref<AdminUserDetails[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

const searchForm = reactive<AdminUserListParams>({
  search: '',
  role: undefined,
  status: undefined,
})

const editDialogVisible = ref(false)
const editingUser = ref<AdminUserDetails | null>(null)
const editForm = reactive<AdminUserUpdateData>({
  is_active: true,
  role: 'user',
})

// 配额分配相关状态
const quotaDialogVisible = ref(false)
const quotaUser = ref<AdminUserDetails | null>(null)
const quotaForm = reactive({
  amount: 0,
  description: '',
})

const loadUsers = async () => {
  try {
    loading.value = true
    const params = {
      ...searchForm,
      page: currentPage.value,
      limit: pageSize.value,
    }

    const response = await getUsers(params)
    if (response.success) {
      const data = response.data as PaginatedResponse<AdminUserDetails>
      users.value = data.data
      total.value = data.total
    } else {
      ElMessage.error(response.error || '获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  loadUsers()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.role = undefined
  searchForm.status = undefined
  currentPage.value = 1
  loadUsers()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadUsers()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  loadUsers()
}

const handleEdit = (user: AdminUserDetails) => {
  editingUser.value = user
  editForm.is_active = user.is_active
  editForm.role = user.role
  editDialogVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editingUser.value) return

  try {
    const response = await updateUser(editingUser.value.id, {
      is_active: editForm.is_active,
      role: editForm.role,
    })
    if (response.success) {
      ElMessage.success('用户更新成功')
      editDialogVisible.value = false
      loadUsers()
    } else {
      ElMessage.error(response.error || '用户更新失败')
    }
  } catch (error) {
    console.error('用户更新失败:', error)
    ElMessage.error('用户更新失败')
  }
}

const handleDelete = async (user: AdminUserDetails) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.email}" 吗？此操作将删除该用户的所有数据，且不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await deleteUser(user.id)
    if (response.success) {
      ElMessage.success('用户删除成功')
      loadUsers()
    } else {
      ElMessage.error(response.error || '用户删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('用户删除失败:', error)
      ElMessage.error('用户删除失败')
    }
  }
}

// 配额分配相关方法
const handleAllocateQuota = (user: AdminUserDetails) => {
  quotaUser.value = user
  quotaForm.amount = 0
  quotaForm.description = ''
  quotaDialogVisible.value = true
}

const handleQuotaSubmit = async () => {
  if (!quotaUser.value) return

  try {
    const response = await apiClient.post(`/api/admin/users/${quotaUser.value.id}/quota`, {
      amount: quotaForm.amount,
      description: quotaForm.description || undefined,
    })

    if (response.success) {
      ElMessage.success('配额分配成功')
      quotaDialogVisible.value = false
      loadUsers()
    } else {
      ElMessage.error(response.error || '配额分配失败')
    }
  } catch (error) {
    console.error('配额分配失败:', error)
    ElMessage.error('配额分配失败')
  }
}

const rowActions = (row: AdminUserDetails) => [
  { label: '编辑', run: () => handleEdit(row) },
  { label: '分配配额', run: () => handleAllocateQuota(row) },
  { label: '删除', danger: true, run: () => handleDelete(row) },
]
const rowLabel = (row: AdminUserDetails) => String(row.email || row.id)

onMounted(() => {
  loadUsers()
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
        <el-form-item label="邮箱地址">
          <el-input v-model="searchForm.search" placeholder="搜索邮箱地址" clearable>
            <template #prefix>
              <font-awesome-icon icon="search" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="选择角色" clearable>
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable>
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
      </AdminFilterBar>

      <!-- 用户列表 -->
      <div class="admin-table-body">
        <el-table :data="users" v-loading="loading" style="width: 100%" :max-height="640">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="email" label="邮箱地址" min-width="200" />
          <el-table-column label="角色" width="100">
            <template #default="{ row }">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
                {{ formatUserRole(row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'danger'">
                {{ formatUserStatus(row.is_active) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="quota" label="剩余配额" width="100" />
          <el-table-column label="临时邮箱" width="100">
            <template #default="{ row }">
              {{ formatNumber(row.tempEmailCount) }}
            </template>
          </el-table-column>
          <el-table-column label="邮件数量" width="100">
            <template #default="{ row }">
              {{ formatNumber(row.emailCount) }}
            </template>
          </el-table-column>
          <el-table-column label="注册时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.created_at).toLocaleString() }}
            </template>
          </el-table-column>
          <AdminActionsColumn :actions="rowActions" :row-label="rowLabel" :width="200" />
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

    <!-- 编辑用户对话框 -->
    <el-dialog class="admin-dialog" v-model="editDialogVisible" title="编辑用户" width="500px">
      <el-form :model="editForm" label-width="80px" label-position="left">
        <el-form-item label="状态">
          <el-switch v-model="editForm.is_active" active-text="正常" inactive-text="禁用" />
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="editForm.role" class="w-full">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="editDialogVisible = false"> 取消 </el-button>
          <el-button type="primary" @click="handleSaveEdit"> 保存 </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 配额分配对话框 -->
    <el-dialog
      class="admin-dialog"
      v-model="quotaDialogVisible"
      :title="`配额分配 - ${quotaUser?.email}`"
      width="500px"
    >
      <div v-if="quotaUser" class="space-y-4">
        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>剩余配额:</strong> {{ quotaUser.quota }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>用户邮箱:</strong> {{ quotaUser.email }}
          </p>
        </div>

        <el-form label-width="80px">
          <el-form-item label="配额数量">
            <el-input-number
              v-model="quotaForm.amount"
              :min="-10000"
              :max="10000"
              controls-position="right"
              class="w-full"
              placeholder="正数为增加，负数为扣除"
            />
            <p class="text-xs text-gray-500 mt-1">正数为增加配额，负数为扣除配额</p>
          </el-form-item>

          <el-form-item label="备注说明">
            <el-input
              v-model="quotaForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入分配原因或备注（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="quotaDialogVisible = false"> 取消 </el-button>
          <el-button @click="handleQuotaSubmit" type="primary" :disabled="!quotaForm.amount">
            确认分配
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
