<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEmailStore } from '@/stores/email'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const emailStore = useEmailStore()

const user = computed(() => authStore.user)
const quotaInfo = computed(() => ({
  total: authStore.userQuota,
  used: emailStore.emailCount,
  remaining: authStore.userQuota - emailStore.emailCount
}))

const loading = ref(false)

onMounted(async () => {
  // 加载用户数据
  try {
    loading.value = true
    await emailStore.fetchTempEmails()
  } catch (error) {
    console.error('Load profile data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
})

// 计算使用率百分比
const usagePercentage = computed(() => {
  if (quotaInfo.value.total === 0) return 0
  return Math.round((quotaInfo.value.used / quotaInfo.value.total) * 100)
})

// 获取使用率颜色
const getUsageColor = (percentage: number) => {
  if (percentage >= 90) return 'text-red-600 dark:text-red-400'
  if (percentage >= 70) return 'text-orange-600 dark:text-orange-400'
  return 'text-green-600 dark:text-green-400'
}

const getUsageBgColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-orange-500'
  return 'bg-green-500'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎卡片 -->
    <div class="card-base p-6">
      <div class="flex items-center space-x-4">
        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <font-awesome-icon 
            :icon="['fas', 'user']" 
            class="text-white text-2xl"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            欢迎回来，{{ user?.email?.split('@')[0] }}！
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            今天是 {{ new Date().toLocaleDateString('zh-CN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            }) }}
          </p>
        </div>
        <div class="text-right">
          <el-tag 
            :type="user?.role === 'admin' ? 'danger' : 'primary'" 
            size="large"
          >
            {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- 总配额 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon 
              :icon="['fas', 'envelope']" 
              class="text-blue-600 dark:text-blue-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">总配额</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.total }}
            </p>
          </div>
        </div>
      </div>

      <!-- 已使用 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon 
              :icon="['fas', 'check-circle']" 
              class="text-green-600 dark:text-green-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">已使用</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.used }}
            </p>
          </div>
        </div>
      </div>

      <!-- 剩余配额 -->
      <div class="card-base p-6">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
            <font-awesome-icon 
              :icon="['fas', 'clock']" 
              class="text-orange-600 dark:text-orange-400 text-xl"
            />
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-600 dark:text-gray-400">剩余配额</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {{ quotaInfo.remaining }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用情况详情 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        配额使用情况
      </h3>
      
      <div class="space-y-4">
        <!-- 使用率进度条 -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">使用率</span>
            <span :class="['text-sm font-medium', getUsageColor(usagePercentage)]">
              {{ usagePercentage }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              :class="['h-3 rounded-full transition-all duration-500', getUsageBgColor(usagePercentage)]"
              :style="{ width: `${usagePercentage}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ quotaInfo.used }} / {{ quotaInfo.total }} 个邮箱
          </p>
        </div>

        <!-- 使用状态提示 -->
        <div v-if="usagePercentage >= 90" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="text-red-600 dark:text-red-400" />
            <p class="text-sm text-red-800 dark:text-red-200">
              配额即将用完，请及时清理不需要的邮箱或联系管理员增加配额。
            </p>
          </div>
        </div>
        <div v-else-if="usagePercentage >= 70" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <font-awesome-icon :icon="['fas', 'info-circle']" class="text-orange-600 dark:text-orange-400" />
            <p class="text-sm text-orange-800 dark:text-orange-200">
              配额使用较多，建议关注使用情况。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        快捷操作
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <router-link to="/dashboard" class="block">
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="text-center">
              <font-awesome-icon 
                :icon="['fas', 'tachometer-alt']" 
                class="text-blue-500 text-2xl mb-2"
              />
              <p class="font-medium text-gray-900 dark:text-gray-100">邮箱管理</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">管理临时邮箱</p>
            </div>
          </div>
        </router-link>

        <router-link to="/profile/quota" class="block">
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="text-center">
              <font-awesome-icon 
                :icon="['fas', 'chart-pie']" 
                class="text-green-500 text-2xl mb-2"
              />
              <p class="font-medium text-gray-900 dark:text-gray-100">配额详情</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">查看配额记录</p>
            </div>
          </div>
        </router-link>

        <router-link to="/profile/checkin" class="block">
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="text-center">
              <font-awesome-icon 
                :icon="['fas', 'calendar-check']" 
                class="text-purple-500 text-2xl mb-2"
              />
              <p class="font-medium text-gray-900 dark:text-gray-100">签到中心</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">每日签到</p>
            </div>
          </div>
        </router-link>

        <router-link to="/profile/settings" class="block">
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div class="text-center">
              <font-awesome-icon 
                :icon="['fas', 'cog']" 
                class="text-gray-500 text-2xl mb-2"
              />
              <p class="font-medium text-gray-900 dark:text-gray-100">个人设置</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">编辑资料</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>

    <!-- 账户信息 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        账户信息
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">邮箱地址</p>
          <p class="font-medium text-gray-900 dark:text-gray-100">{{ user?.email }}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">账户类型</p>
          <el-tag :type="user?.role === 'admin' ? 'danger' : 'primary'" size="small">
            {{ user?.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">注册时间</p>
          <p class="font-medium text-gray-900 dark:text-gray-100">
            {{ new Date(user?.created_at || '').toLocaleDateString('zh-CN') }}
          </p>
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">账户状态</p>
          <el-tag type="success" size="small">正常</el-tag>
        </div>
      </div>
    </div>
  </div>
</template>
