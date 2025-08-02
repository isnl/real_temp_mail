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
    title="兑换配额码"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
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
          placeholder="请输入兑换码"
          :prefix-icon="ElIconTicket"
          autocomplete="off"
        />
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          请输入有效的兑换码以获取更多配额
        </div>
      </el-form-item>

      <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <font-awesome-icon 
            :icon="['fas', 'gift']" 
            class="text-green-500 mt-0.5"
          />
          <div class="text-sm">
            <p class="font-medium text-green-700 dark:text-green-300 mb-1">
              兑换说明
            </p>
            <ul class="text-green-600 dark:text-green-400 space-y-1">
              <li>• 兑换码只能使用一次</li>
              <li>• 配额将立即添加到您的账户</li>
              <li>• 请确保兑换码有效且未过期</li>
              <li>• 如有问题请联系客服</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <div class="flex items-start space-x-3">
          <font-awesome-icon 
            :icon="['fas', 'exclamation-triangle']" 
            class="text-yellow-500 mt-0.5"
          />
          <div class="text-sm">
            <p class="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              注意事项
            </p>
            <p class="text-yellow-600 dark:text-yellow-400">
              请勿与他人分享您的兑换码，以免被盗用
            </p>
          </div>
        </div>
      </div>
    </el-form>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <el-button @click="handleClose" :disabled="loading">
          取消
        </el-button>
        <el-button 
          type="primary" 
          @click="handleSubmit"
          :loading="loading"
        >
          <span v-if="!loading">兑换</span>
          <span v-else>兑换中...</span>
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts">
import { Ticket as ElIconTicket } from '@element-plus/icons-vue'

export default {
  components: {
    ElIconTicket
  }
}
</script>
