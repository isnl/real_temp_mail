<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEmailStore } from '@/stores/email'
import { useQuota } from '@/composables/useQuota'
import { ElMessage } from 'element-plus'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const authStore = useAuthStore()
const emailStore = useEmailStore()
const { quotaInfo, fetchQuotaInfo } = useQuota()

const user = computed(() => authStore.user)
const isAdmin = computed(() => authStore.isAdmin)
const loading = ref(false)

onMounted(async () => {
  // 加载用户数据
  try {
    loading.value = true
    await Promise.all([
      emailStore.fetchTempEmails(),
      fetchQuotaInfo()
    ])
  } catch (error) {
    console.error('Load profile data error:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
})


</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎卡片 -->
    <div class="card-base p-5">
      <div class="flex items-center space-x-4 mb-5">
        <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <font-awesome-icon
            :icon="['fas', 'user']"
            class="text-white text-xl"
          />
        </div>
        <div class="flex-1">
          <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
            欢迎回来，{{ user?.email?.split('@')[0] }}！
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            今天是 {{ new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            }) }}
          </p>
        </div>
        <!-- 只对管理员显示权限标签 -->
        <div v-if="isAdmin" class="text-right">
          <el-tag type="danger" size="large">
            管理员
          </el-tag>
        </div>
      </div>

      <!-- 账户详细信息 -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          账户信息
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <!-- 邮箱地址 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-2">
              <font-awesome-icon :icon="['fas', 'envelope']" class="text-blue-500 text-sm mr-2" />
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">邮箱地址</p>
            </div>
            <p class="text-sm text-gray-900 dark:text-gray-100 mb-1 break-all">{{ user?.email }}</p>
            <el-tag type="success" size="small">已验证</el-tag>
          </div>

          <!-- 注册时间 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-2">
              <font-awesome-icon :icon="['fas', 'calendar-plus']" class="text-green-500 text-sm mr-2" />
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">注册时间</p>
            </div>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {{ new Date(user?.created_at || '').toLocaleDateString('zh-CN') }}
            </p>
          </div>

          <!-- 最后登录 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-2">
              <font-awesome-icon :icon="['fas', 'clock']" class="text-orange-500 text-sm mr-2" />
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">最后登录</p>
            </div>
            <p class="text-sm text-gray-900 dark:text-gray-100">
              {{ new Date().toLocaleDateString('zh-CN') }}
            </p>
          </div>

          <!-- 账户类型 - 只对管理员显示 -->
          <div v-if="isAdmin" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-2">
              <font-awesome-icon :icon="['fas', 'shield-alt']" class="text-red-500 text-sm mr-2" />
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">账户类型</p>
            </div>
            <el-tag type="danger" size="small">管理员</el-tag>
          </div>

          <!-- 账户状态 -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div class="flex items-center mb-2">
              <font-awesome-icon :icon="['fas', 'check-circle']" class="text-green-500 text-sm mr-2" />
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">账户状态</p>
            </div>
            <el-tag type="success" size="small">正常</el-tag>
          </div>
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
              {{ quotaInfo?.total || 0 }}
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
              {{ quotaInfo?.used || 0 }}
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
              {{ quotaInfo?.remaining || 0 }}
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
      </div>
    </div>


  </div>
</template>
