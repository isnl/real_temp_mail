<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { RedeemRequest } from '@/types'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const emailStore = useEmailStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = ref<RedeemRequest>({
  code: '',
  turnstileToken: 'dev-token'
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  
  try {
    await emailStore.redeemCode(form.value)
    emit('success')
    visible.value = false
    
    // 重置表单
    form.value.code = ''
  } catch (error: any) {
    console.error('Redeem code error:', error)
    ElMessage.error(error.message || '兑换失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  visible.value = false
  form.value.code = ''
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
    class="redeem-dialog"
  >
    <!-- Custom Header -->
    <template #header>
      <div class="relative overflow-hidden">
        <!-- Background Gradient -->
        <div class="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"></div>
        <div class="absolute inset-0 bg-black/10"></div>

        <!-- Decorative Elements -->
        <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

        <!-- Content -->
        <div class="relative px-6 py-8 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <font-awesome-icon
              :icon="['fas', 'gift']"
              class="text-white text-2xl"
            />
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">
            配额兑换中心
          </h2>
          <p class="text-white/80 text-sm">
            输入兑换码，立即获取更多邮箱配额
          </p>
        </div>
      </div>
    </template>

    <div class="px-6 py-6">
      <el-form
        ref="formRef"
        :model="form"
        label-position="top"
        size="large"
      >
        <el-form-item
          label="兑换码"
          prop="code"
          :rules="[
            { required: true, message: '请输入兑换码', trigger: 'blur' },
            { min: 6, message: '兑换码长度至少6位', trigger: 'blur' }
          ]"
        >
          <el-input
            v-model="form.code"
            placeholder="请输入您的兑换码"
            :prefix-icon="ElIconTicket"
            autocomplete="off"
            class="redeem-input"
            size="large"
          />
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            兑换码通常为 6-20 位字符，区分大小写
          </div>
        </el-form-item>

        <!-- Premium Features Section -->
        <div class="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-xl mb-6 border border-blue-100 dark:border-blue-800">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <font-awesome-icon
                  :icon="['fas', 'crown']"
                  class="text-white text-lg"
                />
              </div>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                高级功能解锁
              </h3>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <font-awesome-icon :icon="['fas', 'check']" class="text-green-500 text-xs" />
                  <span>无限邮箱创建</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <font-awesome-icon :icon="['fas', 'check']" class="text-green-500 text-xs" />
                  <span>实时邮件推送</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <font-awesome-icon :icon="['fas', 'check']" class="text-green-500 text-xs" />
                  <span>邮件永久保存</span>
                </div>
                <div class="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <font-awesome-icon :icon="['fas', 'check']" class="text-green-500 text-xs" />
                  <span>高级搜索功能</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <font-awesome-icon
              :icon="['fas', 'shield-alt']"
              class="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
            />
            <div class="text-sm">
              <p class="font-medium text-amber-800 dark:text-amber-200 mb-1">
                安全提醒
              </p>
              <p class="text-amber-700 dark:text-amber-300">
                请妥善保管您的兑换码，每个兑换码仅可使用一次。如遇问题，请联系客服获取帮助。
              </p>
            </div>
          </div>
        </div>
      </el-form>
    </div>

    <template #footer>
      <div class="px-6 pb-6">
        <div class="flex justify-end space-x-3">
          <el-button
            @click="handleClose"
            :disabled="loading"
            size="large"
          >
            取消
          </el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="loading"
            size="large"
            class="redeem-button"
          >
            <font-awesome-icon
              v-if="!loading"
              :icon="['fas', 'gift']"
              class="mr-2"
            />
            <span v-if="!loading">立即兑换</span>
            <span v-else>兑换中...</span>
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.redeem-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.redeem-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.redeem-dialog :deep(.el-dialog__footer) {
  padding: 0;
}

.redeem-input :deep(.el-input__wrapper) {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.redeem-input :deep(.el-input__wrapper:hover) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.redeem-input :deep(.el-input__wrapper.is-focus) {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.redeem-button {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.redeem-button:hover {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

.redeem-button:active {
  transform: translateY(0);
}

/* Dark mode adjustments */
.dark .redeem-input :deep(.el-input__wrapper) {
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  border-color: #374151;
}

.dark .redeem-input :deep(.el-input__wrapper:hover) {
  border-color: #60a5fa;
}

.dark .redeem-input :deep(.el-input__wrapper.is-focus) {
  border-color: #60a5fa;
}
</style>

<script lang="ts">
import { Ticket as ElIconTicket } from '@element-plus/icons-vue'

export default {
  components: {
    ElIconTicket
  }
}
</script>
