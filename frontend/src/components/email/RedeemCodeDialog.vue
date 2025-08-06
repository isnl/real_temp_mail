<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { RedeemRequest } from '@/types'
import TurnstileWidget from '@/components/common/TurnstileWidget.vue'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', data?: { quota: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const emailStore = useEmailStore()

const formRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const loading = ref(false)
const turnstileVerified = ref(false)

const form = ref<RedeemRequest>({
  code: '',
  turnstileToken: ''
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Turnstile 回调函数
const onTurnstileSuccess = (token: string) => {
  form.value.turnstileToken = token
  turnstileVerified.value = true
}

const onTurnstileError = (error: string) => {
  console.error('Turnstile error:', error)
  ElMessage.error('人机验证失败，请刷新页面重试')
  turnstileVerified.value = false
  form.value.turnstileToken = ''
}

const onTurnstileExpired = () => {
  ElMessage.warning('人机验证已过期，请重新验证')
  turnstileVerified.value = false
  form.value.turnstileToken = ''
}

const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  // 检查人机验证
  if (!turnstileVerified.value || !form.value.turnstileToken) {
    ElMessage.error('请完成人机验证')
    return
  }

  loading.value = true

  try {
    const response = await emailStore.redeemCode(form.value)

    // 传递兑换结果给父组件，包含新的配额信息
    emit('success', response.data)
    visible.value = false

    // 重置表单
    resetForm()
  } catch (error: any) {
    console.error('Redeem code error:', error)
    ElMessage.error(error.message || '兑换失败')

    // 兑换失败后重置人机验证
    if (turnstileRef.value) {
      turnstileRef.value.reset()
      turnstileVerified.value = false
      form.value.turnstileToken = ''
    }
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value.code = ''
  form.value.turnstileToken = ''
  turnstileVerified.value = false
  if (turnstileRef.value) {
    turnstileRef.value.reset()
  }
}

const handleClose = () => {
  visible.value = false
  resetForm()
}
</script>

<template>
  <el-dialog
    v-model="visible"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
    :show-close="false"
    :align-center="true"
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

        <!-- 人机验证 -->
        <el-form-item label="人机验证" class="mb-6">
          <TurnstileWidget
            ref="turnstileRef"
            @success="onTurnstileSuccess"
            @error="onTurnstileError"
            @expired="onTurnstileExpired"
          />
        </el-form-item>

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
            :disabled="!turnstileVerified"
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
