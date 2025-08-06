<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const authStore = useAuthStore()

const user = computed(() => authStore.user)

// 表单数据
const profileForm = ref({
  email: user.value?.email || '',
  nickname: user.value?.nickname || '',
  avatar: user.value?.avatar || ''
})

// 表单验证规则
const profileRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  nickname: [
    { min: 2, max: 20, message: '昵称长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

const profileFormRef = ref<FormInstance>()
const loading = ref(false)

// 保存个人信息
const saveProfile = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    loading.value = true

    // TODO: 调用API更新个人信息
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟API调用

    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('Update profile error:', error)
    ElMessage.error('更新失败，请重试')
  } finally {
    loading.value = false
  }
}

// 重置表单
const resetForm = () => {
  profileForm.value = {
    email: user.value?.email || '',
    nickname: user.value?.nickname || '',
    avatar: user.value?.avatar || ''
  }
  profileFormRef.value?.clearValidate()
}
</script>

<template>
  <div class="space-y-6">
    <!-- 个人信息编辑 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        个人信息
      </h3>

      <el-form
        ref="profileFormRef"
        :model="profileForm"
        :rules="profileRules"
        label-width="100px"
        class="max-w-2xl"
      >
        <!-- 邮箱 -->
        <el-form-item label="邮箱地址" prop="email">
          <el-input
            v-model="profileForm.email"
            placeholder="请输入邮箱地址"
            disabled
            class="max-w-md"
          >
            <template #suffix>
              <el-tag type="success" size="small">已验证</el-tag>
            </template>
          </el-input>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            邮箱地址不可修改，如需更换请联系管理员
          </p>
        </el-form-item>

        <!-- 昵称 -->
        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="profileForm.nickname"
            placeholder="请输入昵称（可选）"
            class="max-w-md"
          />
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <div class="flex items-center space-x-3">
            <el-button 
              type="primary" 
              @click="saveProfile"
              :loading="loading"
            >
              <font-awesome-icon :icon="['fas', 'save']" class="mr-1" />
              保存更改
            </el-button>
            <el-button @click="resetForm">
              <font-awesome-icon :icon="['fas', 'undo']" class="mr-1" />
              重置
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <!-- 账户信息 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
        账户信息
      </h3>

      <div class="space-y-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">账户类型</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">当前账户权限级别</p>
          </div>
          <el-tag :type="user?.role === 'admin' ? 'danger' : 'primary'" size="small">
            {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">注册时间</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">账户创建日期</p>
          </div>
          <span class="text-sm text-gray-900 dark:text-gray-100">
            {{ new Date(user?.created_at || '').toLocaleDateString('zh-CN') }}
          </span>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">最后登录</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">上次登录时间</p>
          </div>
          <span class="text-sm text-gray-900 dark:text-gray-100">
            {{ new Date().toLocaleDateString('zh-CN') }}
          </span>
        </div>

        <div class="flex items-center justify-between py-3">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">账户状态</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">当前账户状态</p>
          </div>
          <el-tag type="success" size="small">正常</el-tag>
        </div>
      </div>
    </div>
  </div>
</template>
