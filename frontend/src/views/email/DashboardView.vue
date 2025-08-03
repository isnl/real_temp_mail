<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { useEmailStore } from '@/stores/email'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import TempEmailList from '@/components/email/TempEmailList.vue'
import EmailList from '@/components/email/EmailList.vue'
import CreateEmailDialog from '@/components/email/CreateEmailDialog.vue'
import RedeemCodeDialog from '@/components/email/RedeemCodeDialog.vue'

const emailStore = useEmailStore()
const authStore = useAuthStore()

const loading = ref(false)
const showCreateDialog = ref(false)
const showRedeemDialog = ref(false)

const quotaInfo = computed(() => ({
  total: authStore.userQuota,
  used: emailStore.emailCount,
  remaining: authStore.userQuota - emailStore.emailCount
}))

const selectedTempEmail = computed(() => emailStore.selectedTempEmail)
const currentEmails = computed(() => emailStore.currentEmails)

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    await Promise.all([
      emailStore.fetchTempEmails(),
      emailStore.fetchDomains()
    ])
  } catch (error: any) {
    console.error('Load data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleCreateEmail = () => {
  if (quotaInfo.value.remaining <= 0) {
    ElMessage.warning('配额不足，请先兑换配额码')
    showRedeemDialog.value = true
    return
  }
  showCreateDialog.value = true
}

const handleEmailCreated = async () => {
  showCreateDialog.value = false
  await loadData()
  ElMessage.success('临时邮箱创建成功')
}

const handleDeleteEmail = async (emailId: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个临时邮箱吗？删除后将无法恢复相关邮件。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await emailStore.deleteTempEmail(emailId)
    ElMessage.success('临时邮箱删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete email error:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleSelectEmail = async (tempEmail: any) => {
  try {
    await emailStore.fetchEmailsForTempEmail(tempEmail.id)
  } catch (error: any) {
    console.error('Fetch emails error:', error)
    ElMessage.error('获取邮件列表失败')
  }
}

const handleRefresh = async () => {
  await loadData()
  if (selectedTempEmail.value) {
    await emailStore.fetchEmailsForTempEmail(selectedTempEmail.value.id)
  }
  ElMessage.success('刷新成功')
}

const handleRedeemSuccess = async () => {
  showRedeemDialog.value = false
  await authStore.refreshTokens() // 刷新用户信息以更新配额
  ElMessage.success('兑换码使用成功')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          邮箱管理
        </h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          管理您的临时邮箱和接收的邮件
        </p>
      </div>
      
      <div class="mt-4 sm:mt-0 flex items-center space-x-3">
        <el-button
          @click="handleRefresh"
          :disabled="loading"
        >
          <font-awesome-icon
            :icon="['fas', 'refresh']"
            :class="{ 'animate-spin': loading }"
          />
          刷新
        </el-button>

        <el-button
          @click="showRedeemDialog = true"
        >
          <font-awesome-icon :icon="['fas', 'gift']" />
          兑换配额
        </el-button>

        <el-button
          @click="handleCreateEmail"
          type="primary"
        >
          <font-awesome-icon :icon="['fas', 'plus']" />
          创建邮箱
        </el-button>
      </div>
    </div>

    <!-- Quota Info -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <font-awesome-icon 
              :icon="['fas', 'envelope']" 
              class="text-blue-500 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              总配额
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.total }}
            </p>
          </div>
        </div>
      </div>

      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <font-awesome-icon 
              :icon="['fas', 'check-circle']" 
              class="text-green-500 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              已使用
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.used }}
            </p>
          </div>
        </div>
      </div>

      <div class="card-base p-6">
        <div class="flex items-center">
          <div class="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <font-awesome-icon 
              :icon="['fas', 'clock']" 
              class="text-orange-500 text-xl"
            />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              剩余配额
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.remaining }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Temp Email List -->
      <div class="card-base">
        <div class="p-6 border-b border-base">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            临时邮箱列表
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            点击邮箱查看收到的邮件
          </p>
        </div>
        
        <TempEmailList
          :loading="loading"
          @select="handleSelectEmail"
          @delete="handleDeleteEmail"
        />
      </div>

      <!-- Email List -->
      <div class="card-base">
        <div class="p-6 border-b border-base">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            邮件列表
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span v-if="selectedTempEmail">
              {{ selectedTempEmail.email }} 的邮件
            </span>
            <span v-else>
              请先选择一个临时邮箱
            </span>
          </p>
        </div>
        
        <EmailList
          v-if="selectedTempEmail"
          :temp-email-id="selectedTempEmail.id"
          :emails="currentEmails"
          :loading="emailStore.isLoading"
        />
        
        <div v-else class="p-12 text-center">
          <font-awesome-icon 
            :icon="['fas', 'envelope-open']" 
            class="text-6xl text-gray-300 dark:text-gray-600 mb-4"
          />
          <p class="text-gray-500 dark:text-gray-400">
            请选择一个临时邮箱查看邮件
          </p>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <CreateEmailDialog
      v-model="showCreateDialog"
      @success="handleEmailCreated"
    />
    
    <RedeemCodeDialog
      v-model="showRedeemDialog"
      @success="handleRedeemSuccess"
    />
  </div>
</template>
