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
    await emailStore.fetchTempEmails()
  } catch (error) {
    console.error('Load profile data error:', error)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
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
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">配额使用率</p>
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              class="bg-blue-500 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${(quotaInfo.used / quotaInfo.total) * 100}%` }"
            ></div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ quotaInfo.used }} / {{ quotaInfo.total }} ({{ Math.round((quotaInfo.used / quotaInfo.total) * 100) }}%)
          </p>
        </div>

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
