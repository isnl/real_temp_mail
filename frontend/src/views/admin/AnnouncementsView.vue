<script lang="ts" setup>
import AdminFilterBar from '@/components/admin/AdminFilterBar.vue'
import AdminPagination from '@/components/admin/AdminPagination.vue'
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus,
  type Announcement,
  type CreateAnnouncementData,
  type UpdateAnnouncementData,
  type AdminAnnouncementListParams,
} from '@/api/admin'

// 响应式数据
const loading = ref(false)
const announcements = ref<Announcement[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 搜索和筛选
const searchForm = reactive({
  search: '',
  status: '' as '' | 'active' | 'inactive',
})

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEditing = ref(false)
const currentAnnouncementId = ref<number | null>(null)

// 表单数据
const formRef = ref<FormInstance>()
const editorRef = ref()
const formData = reactive<CreateAnnouncementData>({
  title: '',
  content: '',
  is_active: true,
})

// 表单验证规则
const formRules: FormRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' },
    { max: 200, message: '标题不能超过200个字符', trigger: 'blur' },
  ],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }],
}

// 获取公告列表
const fetchAnnouncements = async () => {
  try {
    loading.value = true
    const params: AdminAnnouncementListParams = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchForm.search || undefined,
      status: searchForm.status || undefined,
    }

    const response = await getAnnouncements(params)
    if (response.success && response.data) {
      announcements.value = response.data.data
      total.value = response.data.total
    }
  } catch (error) {
    console.error('获取公告列表失败:', error)
    ElMessage.error('获取公告列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchAnnouncements()
}

// 重置搜索
const resetSearch = () => {
  searchForm.search = ''
  searchForm.status = ''
  currentPage.value = 1
  fetchAnnouncements()
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchAnnouncements()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  fetchAnnouncements()
}

// 打开新增对话框
const openCreateDialog = () => {
  dialogTitle.value = '新增公告'
  isEditing.value = false
  currentAnnouncementId.value = null
  resetForm()
  dialogVisible.value = true
}

// 编辑器准备就绪回调
const onEditorReady = () => {
  // 文本域编辑器不需要特殊处理
}

// 打开编辑对话框
const openEditDialog = (announcement: Announcement) => {
  dialogTitle.value = '编辑公告'
  isEditing.value = true
  currentAnnouncementId.value = announcement.id

  // 设置表单数据
  formData.title = announcement.title
  formData.content = announcement.content
  formData.is_active = announcement.is_active

  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  formData.title = ''
  formData.content = ''
  formData.is_active = true
  formRef.value?.clearValidate()
}

// 关闭对话框
const closeDialog = () => {
  dialogVisible.value = false
  // 重置所有状态
  isEditing.value = false
  currentAnnouncementId.value = null

  // 延迟重置表单，确保对话框完全关闭
  nextTick(() => {
    resetForm()
  })
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    loading.value = true

    if (isEditing.value && currentAnnouncementId.value) {
      // 编辑公告
      const updateData: UpdateAnnouncementData = {
        title: formData.title,
        content: formData.content,
        is_active: formData.is_active,
      }
      await updateAnnouncement(currentAnnouncementId.value, updateData)
      ElMessage.success('公告更新成功')
    } else {
      // 新增公告
      await createAnnouncement(formData)
      ElMessage.success('公告创建成功')
    }

    closeDialog()
    fetchAnnouncements()
  } catch (error) {
    console.error('提交表单失败:', error)
    ElMessage.error(isEditing.value ? '更新公告失败' : '创建公告失败')
  } finally {
    loading.value = false
  }
}

// 切换公告状态
const handleToggleStatus = async (announcement: Announcement) => {
  try {
    await toggleAnnouncementStatus(announcement.id)
    ElMessage.success(`公告已${announcement.is_active ? '禁用' : '启用'}`)
    fetchAnnouncements()
  } catch (error) {
    console.error('切换公告状态失败:', error)
    ElMessage.error('切换公告状态失败')
  }
}

// 删除公告
const handleDelete = async (announcement: Announcement) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除公告"${announcement.title}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await deleteAnnouncement(announcement.id)
    ElMessage.success('公告删除成功')
    fetchAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除公告失败:', error)
      ElMessage.error('删除公告失败')
    }
  }
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchAnnouncements()
})
</script>

<template>
  <div class="admin-module">
    <!-- 页面标题 -->
    <div class="admin-toolbar">
      <el-button type="primary" @click="openCreateDialog">
        <font-awesome-icon icon="plus" class="mr-2" />
        新增公告
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <AdminFilterBar :loading="loading" @search="handleSearch" @reset="resetSearch">
      <el-form-item label="关键词">
        <el-input v-model="searchForm.search" placeholder="搜索标题或内容..." clearable>
          <template #prefix>
            <font-awesome-icon icon="search" class="text-gray-400" />
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="searchForm.status" placeholder="全部状态" clearable class="w-full">
          <el-option label="启用" value="active" />
          <el-option label="禁用" value="inactive" />
        </el-select>
      </el-form-item>
    </AdminFilterBar>

    <div class="admin-table-card">
      <el-table :data="announcements" :max-height="640" v-loading="loading" class="w-full">
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="title" label="标题" min-width="200">
          <template #default="{ row }">
            <div class="font-medium text-gray-900 dark:text-gray-100">
              {{ row.title }}
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="content" label="内容" min-width="300">
          <template #default="{ row }">
            <MarkdownRenderer
              :content="row.content"
              :max-lines="3"
              class="text-gray-600 dark:text-gray-400"
            />
          </template>
        </el-table-column>

        <el-table-column prop="is_active" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            <span class="text-gray-600 dark:text-gray-400">
              {{ formatDate(row.created_at) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-2">
              <el-button
                type="primary"
                size="small"
                text
                @click="openEditDialog(row)"
                aria-label="编辑"
                title="编辑"
              >
                <font-awesome-icon icon="edit" />
              </el-button>

              <el-button
                :type="row.is_active ? 'warning' : 'success'"
                size="small"
                text
                @click="handleToggleStatus(row)"
                :aria-label="row.is_active ? '禁用' : '启用'"
              >
                <font-awesome-icon :icon="row.is_active ? 'eye-slash' : 'eye'" />
              </el-button>

              <el-button
                type="danger"
                size="small"
                text
                @click="handleDelete(row)"
                aria-label="删除"
                title="删除"
              >
                <font-awesome-icon icon="trash" />
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <AdminPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      class="admin-dialog"
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1200px"
      @close="closeDialog"
      align-center
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        class="space-y-4"
      >
        <el-form-item label="公告标题" prop="title">
          <el-input
            v-model="formData.title"
            placeholder="请输入公告标题"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <div class="w-full">
            <MarkdownEditor
              ref="editorRef"
              v-model="formData.content"
              placeholder="请输入公告内容..."
              height="500px"
              @editor-ready="onEditorReady"
              class="w-full"
            />
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="formData.is_active" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-3">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitForm" :loading="loading">
            {{ isEditing ? '更新' : '创建' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
