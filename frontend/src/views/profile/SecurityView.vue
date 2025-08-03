<script lang="ts" setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { authApi } from '@/api/auth'

// 修改密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordFormRef = ref<FormInstance>()
const passwordLoading = ref(false)

// 密码验证规则
const passwordRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, message: '密码长度至少8位', trigger: 'blur' },
    {
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: '密码必须包含大小写字母、数字和特殊字符',
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return

  passwordFormRef.value.validate()
    .then(async () => {
      passwordLoading.value = true

      try {
        // 调用真实的API修改密码
        const response = await authApi.changePassword({
          currentPassword: passwordForm.value.currentPassword,
          newPassword: passwordForm.value.newPassword,
          confirmPassword: passwordForm.value.confirmPassword,
        })

        if (response.success) {
          ElMessage.success('密码修改成功')

          // 重置表单
          passwordForm.value = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          }
          passwordFormRef.value?.resetFields()
        } else {
          ElMessage.error(response.error || '密码修改失败')
        }
      } catch (error: any) {
        console.error('Change password error:', error)
        ElMessage.error(error.message || '密码修改失败，请重试')
      } finally {
        passwordLoading.value = false
      }
    })
    .catch(() => {
      // 表单验证失败，不需要额外处理，Element Plus 会自动显示验证错误
      console.log('表单验证失败')
    })
}

// 密码强度检测
const getPasswordStrength = (password: string) => {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[@$!%*?&]/.test(password)) strength++

  return strength
}

const getPasswordStrengthText = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return '弱'
    case 2:
    case 3:
      return '中等'
    case 4:
    case 5:
      return '强'
    default:
      return '弱'
  }
}

const getPasswordStrengthColor = (strength: number) => {
  switch (strength) {
    case 0:
    case 1:
      return 'text-red-600 dark:text-red-400'
    case 2:
    case 3:
      return 'text-orange-600 dark:text-orange-400'
    case 4:
    case 5:
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-red-600 dark:text-red-400'
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 修改密码 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">修改密码</h3>

      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="120px"
        class="max-w-2xl"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            class="max-w-md"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <div class="w-full">
            <el-input
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
              class="max-w-md"
            />

            <!-- 密码强度显示 -->
            <div v-if="passwordForm.newPassword" class="mt-3 max-w-md">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600 dark:text-gray-400">密码强度:</span>
                <span
                  :class="[
                    'text-sm font-medium',
                    getPasswordStrengthColor(getPasswordStrength(passwordForm.newPassword)),
                  ]"
                >
                  {{ getPasswordStrengthText(getPasswordStrength(passwordForm.newPassword)) }}
                </span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  :class="[
                    'h-2 rounded-full transition-all duration-300',
                    getPasswordStrength(passwordForm.newPassword) <= 1
                      ? 'bg-red-500'
                      : getPasswordStrength(passwordForm.newPassword) <= 3
                        ? 'bg-orange-500'
                        : 'bg-green-500',
                  ]"
                  :style="{ width: `${(getPasswordStrength(passwordForm.newPassword) / 5) * 100}%` }"
                ></div>
              </div>
            </div>

            <!-- 密码要求说明 -->
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-md">
              密码必须包含大小写字母、数字和特殊字符，长度至少8位
            </p>
          </div>
        </el-form-item>

        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            class="max-w-md"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="changePassword" :loading="passwordLoading">
            <font-awesome-icon :icon="['fas', 'key']" class="mr-1" />
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
