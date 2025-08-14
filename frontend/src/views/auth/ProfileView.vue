<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'
import { checkinApi, formatQuotaSource, formatQuotaType, getQuotaSourceIcon } from '@/api/checkin'
import type { QuotaLog } from '@/types'

const authStore = useAuthStore()
const emailStore = useEmailStore()

const user = computed(() => authStore.user)
const quotaInfo = computed(() => ({
  total: authStore.userQuota,
  used: emailStore.emailCount,
  remaining: authStore.userQuota - emailStore.emailCount
}))

const loading = ref(false)

// 配额记录相关状态
const quotaLogs = ref<QuotaLog[]>([])
const quotaLoading = ref(false)
const quotaTotal = ref(0)
const quotaPage = ref(1)

onMounted(async () => {
  // 加载用户数据
  try {
    await emailStore.fetchTempEmails()
    await loadQuotaLogs()
  } catch (error) {
    console.error('Load profile data error:', error)
  }
})

// 配额记录相关方法
const loadQuotaLogs = async (reset = true) => {
  if (reset) {
    quotaPage.value = 1
    quotaLogs.value = []
  }

  quotaLoading.value = true
  try {
    const response = await checkinApi.getQuotaLogs(quotaPage.value, 10)
    if (response.success && response.data) {
      if (reset) {
        quotaLogs.value = response.data.logs
      } else {
        quotaLogs.value.push(...response.data.logs)
      }
      quotaTotal.value = response.data.total
    }
  } catch (error) {
    console.error('Load quota logs error:', error)
    ElMessage.error('加载配额记录失败')
  } finally {
    quotaLoading.value = false
  }
}

const loadMoreQuotaLogs = async () => {
  quotaPage.value++
  await loadQuotaLogs(false)
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-1500px px-4 mx-auto h-full overflow-y-auto">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
        个人中心
      </h1>
      <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
        管理您的账户信息和使用情况
      </p>
    </div>

    <!-- User Info Card -->
    <div class="card-base p-6">
      <div class="flex items-center space-x-4 mb-6">
        <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
          <font-awesome-icon 
            :icon="['fas', 'user']" 
            class="text-white text-2xl"
          />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ user?.email }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div class="flex items-center space-x-3">
            <font-awesome-icon 
              :icon="['fas', 'envelope']" 
              class="text-blue-500 text-xl"
            />
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">总配额</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ quotaInfo.total }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div class="flex items-center space-x-3">
            <font-awesome-icon 
              :icon="['fas', 'check-circle']" 
              class="text-green-500 text-xl"
            />
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">已使用</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ quotaInfo.used }}
              </p>
            </div>
          </div>
        </div>

        <div class="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div class="flex items-center space-x-3">
            <font-awesome-icon 
              :icon="['fas', 'clock']" 
              class="text-orange-500 text-xl"
            />
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-400">剩余配额</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {{ quotaInfo.remaining }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Account Settings -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        账户设置
      </h3>
      
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">修改密码</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">更新您的登录密码</p>
          </div>
          <el-button type="primary" size="small">
            修改密码
          </el-button>
        </div>

        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p class="font-medium text-gray-900 dark:text-gray-100">邮箱验证</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">验证您的邮箱地址</p>
          </div>
          <el-tag type="success" size="small">已验证</el-tag>
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

    <!-- Usage Statistics -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        使用统计
      </h3>
      
      <div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">账户类型</p>
        <div class="flex items-center space-x-2">
          <el-tag :type="user?.role === 'admin' ? 'danger' : 'primary'" size="small">
            {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            注册时间: {{ new Date(user?.created_at || '').toLocaleDateString('zh-CN') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Quota Records -->
    <div class="card-base p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          配额记录
        </h3>
        <el-button @click="loadQuotaLogs" size="small" :loading="quotaLoading">
          <font-awesome-icon :icon="['fas', 'refresh']" class="mr-1" />
          刷新
        </el-button>
      </div>

      <div v-if="quotaLogs.length === 0 && !quotaLoading" class="text-center py-8">
        <font-awesome-icon :icon="['fas', 'inbox']" class="text-4xl text-gray-400 mb-4" />
        <p class="text-gray-500 dark:text-gray-400">暂无配额记录</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="log in quotaLogs"
          :key="log.id"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center',
                log.type === 'earn' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
              ]"
            >
              <font-awesome-icon
                :icon="['fas', getQuotaSourceIcon(log.source)]"
                :class="[
                  'text-sm',
                  log.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                ]"
              />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                {{ log.description || formatQuotaSource(log.source) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ new Date(log.created_at).toLocaleString('zh-CN') }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p
              :class="[
                'font-semibold',
                log.type === 'earn' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
              ]"
            >
              {{ log.type === 'earn' ? '+' : '-' }}{{ log.amount }}
            </p>
            <el-tag
              :type="log.type === 'earn' ? 'success' : 'warning'"
              size="small"
            >
              {{ formatQuotaType(log.type) }}
            </el-tag>
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="quotaTotal > quotaLogs.length" class="flex justify-center mt-4">
          <el-button
            @click="loadMoreQuotaLogs"
            :loading="quotaLoading"
            size="small"
          >
            加载更多
          </el-button>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        快捷操作
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <router-link to="/dashboard" class="block">
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="flex items-center space-x-3">
              <font-awesome-icon 
                :icon="['fas', 'tachometer-alt']" 
                class="text-blue-500 text-xl"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-gray-100">控制台</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">管理邮箱</p>
              </div>
            </div>
          </div>
        </router-link>

        <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
          <div class="flex items-center space-x-3">
            <font-awesome-icon 
              :icon="['fas', 'gift']" 
              class="text-green-500 text-xl"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">兑换配额</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">使用兑换码</p>
            </div>
          </div>
        </div>

        <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
          <div class="flex items-center space-x-3">
            <font-awesome-icon 
              :icon="['fas', 'download']" 
              class="text-purple-500 text-xl"
            />
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">导出数据</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">下载邮件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
