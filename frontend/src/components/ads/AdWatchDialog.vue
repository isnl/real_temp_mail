<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { adsApi } from '@/api/ads'
import type { GenerateQRCodeResponse, VerifyAdStatusResponse } from '@/api/ads'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', data: { quota: number; message: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 状态管理
const loading = ref(false)
const verifying = ref(false)
const qrCodeData = ref<GenerateQRCodeResponse | null>(null)

// 重置状态
const resetState = () => {
  loading.value = false
  verifying.value = false
  qrCodeData.value = null
}

// 监听对话框打开，自动生成二维码
watch(dialogVisible, async (visible) => {
  if (visible) {
    await generateQRCode()
  } else {
    resetState()
  }
})

// 生成二维码
const generateQRCode = async () => {
  loading.value = true
  try {
    const response = await adsApi.generateQRCode()
    
    if (response.success && response.data) {
      qrCodeData.value = response.data
    } else {
      ElMessage.error(response.error || '生成二维码失败')
      dialogVisible.value = false
    }
  } catch (error: any) {
    console.error('Generate QR code error:', error)
    ElMessage.error(error.message || '生成二维码失败')
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
}

// 验证广告观看状态
const verifyAdStatus = async () => {
  if (!qrCodeData.value?.code) {
    ElMessage.error('缺少验证码')
    return
  }

  verifying.value = true
  try {
    const response = await adsApi.verifyAdStatus({
      code: qrCodeData.value.code
    })

    if (response.success && response.data) {
      if (response.data.success) {
        // 观看完成，发放奖励
        ElMessage.success(response.data.message)
        emit('success', {
          quota: response.data.quota || 0,
          message: response.data.message
        })
        dialogVisible.value = false
      } else {
        // 尚未观看完成
        ElMessage.warning(response.data.message)
      }
    } else {
      ElMessage.error(response.error || '验证失败')
    }
  } catch (error: any) {
    console.error('Verify ad status error:', error)
    ElMessage.error(error.message || '验证失败')
  } finally {
    verifying.value = false
  }
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="免费获取配额"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
  >
    <div class="flex flex-col items-center gap-6">
      <!-- 说明文字 -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          扫码观看广告视频
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          使用微信扫描下方二维码，观看完整广告视频即可获得 <span class="font-semibold text-blue-500">2个永久配额</span>
        </p>
      </div>

      <!-- 二维码区域 -->
      <div class="flex items-center justify-center w-64 h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div v-if="loading" class="text-center">
          <el-icon class="animate-spin text-2xl text-blue-500 mb-2">
            <font-awesome-icon :icon="['fas', 'spinner']" />
          </el-icon>
          <p class="text-sm text-gray-600 dark:text-gray-400">生成二维码中...</p>
        </div>
        
        <div v-else-if="qrCodeData" class="text-center">
          <img 
            :src="qrCodeData.qrCodeUrl" 
            alt="广告二维码"
            class="w-48 h-48 mx-auto rounded-lg shadow-md"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            请使用微信扫描
          </p>
        </div>
        
        <div v-else class="text-center">
          <el-icon class="text-4xl text-gray-400 mb-2">
            <font-awesome-icon :icon="['fas', 'qrcode']" />
          </el-icon>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">二维码加载失败</p>
          <el-button size="small" @click="generateQRCode">重新生成</el-button>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="text-center text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center justify-center gap-2 mb-2">
          <el-icon class="text-green-500">
            <font-awesome-icon :icon="['fas', 'mobile-alt']" />
          </el-icon>
          <span>1. 使用微信扫描二维码</span>
        </div>
        <div class="flex items-center justify-center gap-2 mb-2">
          <el-icon class="text-blue-500">
            <font-awesome-icon :icon="['fas', 'play']" />
          </el-icon>
          <span>2. 观看完整广告视频</span>
        </div>
        <div class="flex items-center justify-center gap-2">
          <el-icon class="text-orange-500">
            <font-awesome-icon :icon="['fas', 'check-circle']" />
          </el-icon>
          <span>3. 点击下方验证按钮</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-center">
        <el-button
          type="primary"
          size="large"
          :loading="verifying"
          :disabled="!qrCodeData || loading"
          @click="verifyAdStatus"
          class="px-8"
        >
          <font-awesome-icon 
            v-if="!verifying" 
            :icon="['fas', 'check']" 
            class="mr-2" 
          />
          {{ verifying ? '验证中...' : '验证观看状态' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.el-dialog {
  border-radius: 12px;
}

.el-dialog__header {
  text-align: center;
  padding: 20px 20px 10px;
}

.el-dialog__body {
  padding: 20px;
}

.el-dialog__footer {
  padding: 10px 20px 20px;
}
</style>
