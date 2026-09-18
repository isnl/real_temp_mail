<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { useTurnstile } from '@/composables/useTurnstile'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { RedeemRequest } from '@/types'

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
const turnstile = useTurnstile('redeem')

const formRef = ref<FormInstance>()
const turnstileRef = ref<InstanceType<typeof TurnstileWidget>>()
const loading = ref(false)

const form = ref<RedeemRequest>({
  code: '',
  turnstileToken: '',
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  if (!turnstile.isVerified.value) {
    ElMessage.warning('请完成人机验证')
    return
  }

  loading.value = true

  try {
    form.value.turnstileToken = turnstile.required.value
      ? turnstile.turnstileToken.value
      : undefined

    const response = await emailStore.redeemCode(form.value)

    // 传递兑换结果给父组件，包含新的配额信息
    emit('success', response.data)
    visible.value = false

    // 重置表单
    resetForm()
  } catch (error) {
    console.error('Redeem code error:', error)
    ElMessage.error(error instanceof Error ? error.message : '兑换失败')

    // 重置 Turnstile
    turnstileRef.value?.reset()
    turnstile.reset()
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value.code = ''
  form.value.turnstileToken = ''
  turnstile.reset()
}

const handleClose = () => {
  visible.value = false
  resetForm()
}

// 处理 Turnstile 验证成功
const handleTurnstileSuccess = (token: string) => {
  turnstile.handleSuccess(token)
  form.value.turnstileToken = token
}

// 处理 Turnstile 验证失败
const handleTurnstileError = (error: string) => {
  turnstile.handleError(error)
  form.value.turnstileToken = ''
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
        <!-- Mint surface -->
        <div class="absolute inset-0 bg-primary-100 dark:bg-primary-900"></div>

        <!-- Decorative Elements -->
        <div
          class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"
        ></div>
        <div
          class="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"
        ></div>

        <!-- Content -->
        <div class="relative px-6 py-8 text-center">
          <div
            class="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-full mb-4"
          >
            <font-awesome-icon :icon="['fas', 'gift']" class="text-white text-2xl" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">配额兑换中心</h2>
          <p class="text-gray-600 dark:text-gray-300 text-sm">输入兑换码，立即获取更多邮箱配额</p>
        </div>
      </div>
    </template>

    <div class="px-6 py-6">
      <el-form ref="formRef" :model="form" label-position="top" size="large">
        <el-form-item
          label="兑换码"
          prop="code"
          :rules="[
            { required: true, message: '请输入兑换码', trigger: 'blur' },
            { min: 6, message: '兑换码长度至少6位', trigger: 'blur' },
          ]"
        >
          <el-input
            v-model="form.code"
            placeholder="请输入您的兑换码"
            autocomplete="off"
            class="redeem-input"
            size="large"
          >
            <template #prefix>
              <font-awesome-icon :icon="['fas', 'ticket-alt']" />
            </template>
          </el-input>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            兑换码通常为 6-20 位字符，区分大小写
          </div>
        </el-form-item>

        <!-- Turnstile 人机验证 -->
        <el-form-item v-if="turnstile.required.value" label="人机验证" required>
          <div class="w-full">
            <TurnstileWidget
              v-if="turnstile.siteKey.value"
              ref="turnstileRef"
              :site-key="turnstile.siteKey.value"
              action="redeem"
              :theme="turnstile.theme.value"
              @success="handleTurnstileSuccess"
              @error="handleTurnstileError"
              @expired="turnstile.handleExpired"
              @timeout="turnstile.handleTimeout"
              @before-interactive="turnstile.handleBeforeInteractive"
              @after-interactive="turnstile.handleAfterInteractive"
              @unsupported="turnstile.handleUnsupported"
            />

            <!-- 仅显示错误信息 -->
            <div
              v-if="turnstile.configurationError.value || turnstile.error.value"
              class="text-red-600 dark:text-red-400 text-sm mt-2"
              role="alert"
            >
              <font-awesome-icon :icon="['fas', 'triangle-exclamation']" class="mr-1" />
              {{ turnstile.configurationError.value || turnstile.error.value }}
            </div>
          </div>
        </el-form-item>

        <!-- Security Notice -->
        <div
          class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4"
        >
          <div class="flex items-start space-x-3">
            <font-awesome-icon
              :icon="['fas', 'shield-alt']"
              class="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
            />
            <div class="text-sm">
              <p class="font-medium text-amber-800 dark:text-amber-200 mb-1">安全提醒</p>
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
          <el-button @click="handleClose" :disabled="loading" size="large"> 取消 </el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="loading"
            :disabled="
              !turnstile.isVerified.value || !!turnstile.configurationError.value || loading
            "
            size="large"
            class="redeem-button"
          >
            <font-awesome-icon v-if="!loading" :icon="['fas', 'gift']" class="mr-2" />
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
  border: 2px solid var(--border);
  border-radius: 12px;
  transition: all 0.3s ease;
  background: var(--surface-muted);
}

.redeem-input :deep(.el-input__wrapper:hover) {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus) 10%, transparent);
}

.redeem-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--focus);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus) 20%, transparent);
}

.redeem-button {
  background: var(--brand-button);
  color: var(--brand-button-text);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.redeem-button:hover {
  background: var(--brand-button-hover);
  transform: none;
  box-shadow: none;
}

.redeem-button:active {
  transform: translateY(0);
}

/* Dark mode adjustments */
.dark .redeem-input :deep(.el-input__wrapper) {
  background: var(--surface-muted);
  border-color: var(--border);
}

.dark .redeem-input :deep(.el-input__wrapper:hover) {
  border-color: var(--focus);
}

.dark .redeem-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--focus);
}
</style>
