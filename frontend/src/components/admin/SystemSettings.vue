<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSystemSettings, updateSystemSetting } from '@/api/admin'
import type { SystemSetting } from '@/api/admin'

const loading = ref(false)
const settings = ref<SystemSetting[]>([])

const editDialogVisible = ref(false)
const editingSetting = ref<SystemSetting | null>(null)
const editForm = reactive({
  value: ''
})

const loadSettings = async () => {
  try {
    loading.value = true
    const response = await getSystemSettings()
    if (response.success && response.data) {
      settings.value = response.data
    } else {
      ElMessage.error(response.error || '获取系统设置失败')
    }
  } catch (error) {
    console.error('获取系统设置失败:', error)
    ElMessage.error('获取系统设置失败')
  } finally {
    loading.value = false
  }
}

const handleEdit = (setting: SystemSetting) => {
  editingSetting.value = setting
  editForm.value = setting.setting_value
  editDialogVisible.value = true
}

const handleSave = async () => {
  if (!editingSetting.value) return

  try {
    const response = await updateSystemSetting(editingSetting.value.setting_key, editForm.value)
    if (response.success) {
      ElMessage.success('设置更新成功')
      editDialogVisible.value = false
      await loadSettings()
    } else {
      ElMessage.error(response.error || '更新设置失败')
    }
  } catch (error) {
    console.error('更新设置失败:', error)
    ElMessage.error('更新设置失败')
  }
}

const getSettingDisplayName = (key: string): string => {
  const nameMap: Record<string, string> = {
    'daily_checkin_quota': '每日签到奖励配额',
    'default_user_quota': '注册默认配额'
  }
  return nameMap[key] || key
}

const getSettingDescription = (setting: SystemSetting): string => {
  if (setting.description) return setting.description

  const descMap: Record<string, string> = {
    'daily_checkin_quota': '用户每日签到可获得的配额数量',
    'default_user_quota': '用户注册时默认赠送的配额数量'
  }
  return descMap[setting.setting_key] || '系统配置项'
}

const validateValue = (key: string, value: string): boolean => {
  switch (key) {
    case 'daily_checkin_quota':
      const dailyNum = parseInt(value)
      return !isNaN(dailyNum) && dailyNum >= 0 && dailyNum <= 100
    case 'default_user_quota':
      const registerNum = parseInt(value)
      return !isNaN(registerNum) && registerNum >= 0 && registerNum <= 1000
    default:
      return value.trim().length > 0
  }
}

const getValidationMessage = (key: string): string => {
  switch (key) {
    case 'daily_checkin_quota':
      return '请输入0-100之间的整数'
    case 'default_user_quota':
      return '请输入0-1000之间的整数'
    default:
      return '请输入有效值'
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          系统设置
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          管理系统配置参数
        </p>
      </div>
      
      <el-button @click="loadSettings" :loading="loading" size="default">
        <font-awesome-icon :icon="['fas', 'refresh']" class="mr-2" />
        刷新
      </el-button>
    </div>

    <!-- Settings List -->
    <div class="card-base">
      <div v-if="loading" class="flex justify-center py-8">
        <el-icon class="is-loading text-2xl text-blue-500">
          <font-awesome-icon :icon="['fas', 'spinner']" />
        </el-icon>
      </div>

      <div v-else-if="settings.length === 0" class="text-center py-8">
        <font-awesome-icon :icon="['fas', 'cog']" class="text-4xl text-gray-400 mb-4" />
        <p class="text-gray-500 dark:text-gray-400">暂无系统设置</p>
      </div>

      <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
        <div 
          v-for="setting in settings" 
          :key="setting.id"
          class="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <font-awesome-icon 
                    :icon="['fas', 'cog']" 
                    class="text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-gray-100">
                    {{ getSettingDisplayName(setting.setting_key) }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ getSettingDescription(setting) }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    键: {{ setting.setting_key }}
                  </p>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <p class="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ setting.setting_value }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  更新时间: {{ new Date(setting.updated_at).toLocaleString('zh-CN') }}
                </p>
              </div>
              
              <el-button 
                @click="handleEdit(setting)" 
                type="primary" 
                size="small"
              >
                <font-awesome-icon :icon="['fas', 'edit']" class="mr-1" />
                编辑
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <el-dialog
      v-model="editDialogVisible"
      :title="`编辑设置: ${editingSetting ? getSettingDisplayName(editingSetting.setting_key) : ''}`"
      width="500px"
    >
      <div v-if="editingSetting" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            设置值
          </label>
          <el-input
            v-model="editForm.value"
            :placeholder="getValidationMessage(editingSetting.setting_key)"
            size="large"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ getSettingDescription(editingSetting) }}
          </p>
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>当前值:</strong> {{ editingSetting.setting_value }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            <strong>设置键:</strong> {{ editingSetting.setting_key }}
          </p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <el-button @click="editDialogVisible = false">
            取消
          </el-button>
          <el-button 
            @click="handleSave" 
            type="primary"
            :disabled="!editingSetting || !validateValue(editingSetting.setting_key, editForm.value)"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.card-base {
  @apply bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm;
}
</style>
