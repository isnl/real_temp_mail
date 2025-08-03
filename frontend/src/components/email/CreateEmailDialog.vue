<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import type { CreateEmailRequest } from '@/types'

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

const form = ref<CreateEmailRequest>({
  domainId: 0,
  turnstileToken: 'dev-token'
})

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const domains = computed(() => emailStore.availableDomains)

onMounted(async () => {
  if (domains.value.length === 0) {
    await emailStore.fetchDomains()
  }
  
  // 设置默认域名
  if (domains.value.length > 0) {
    form.value.domainId = domains.value[0].id
  }
})

const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  
  try {
    await emailStore.createTempEmail(form.value)
    emit('success')
    visible.value = false
    
    // 重置表单
    form.value.domainId = domains.value[0]?.id || 0
  } catch (error: any) {
    console.error('Create email error:', error)
    ElMessage.error(error.message || '创建失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="创建临时邮箱"
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
        label="选择域名" 
        prop="domainId"
        :rules="[{ required: true, message: '请选择域名', trigger: 'change' }]"
      >
        <el-select
          v-model="form.domainId"
          placeholder="请选择域名"
          class="w-full"
        >
          <el-option
            v-for="domain in domains"
            :key="domain.id"
            :label="`@${domain.domain}`"
            :value="domain.id"
          >
            <div class="flex items-center justify-between">
              <span>@{{ domain.domain }}</span>
              <el-tag size="small" type="success">可用</el-tag>
            </div>
          </el-option>
        </el-select>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          系统将自动生成随机的邮箱前缀
        </div>
      </el-form-item>

      <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
        <div class="flex items-start space-x-3">
          <font-awesome-icon 
            :icon="['fas', 'info-circle']" 
            class="text-blue-500 mt-0.5"
          />
          <div class="text-sm">
            <p class="font-medium text-blue-700 dark:text-blue-300 mb-1">
              创建说明
            </p>
            <ul class="text-blue-600 dark:text-blue-400 flex flex-col gap-1">
              <li>• 每个临时邮箱消耗1个配额</li>
              <li>• 邮箱地址随机生成，确保唯一性</li>
              <li>• 邮件将实时推送到您的收件箱</li>
              <li>• 可随时删除不需要的邮箱</li>
            </ul>
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
          <span v-if="!loading">创建邮箱</span>
          <span v-else>创建中...</span>
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>
