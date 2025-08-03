<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const testResults = ref({
  userLayoutLoaded: false,
  adminLayoutLoaded: false,
  noConflicts: false
})

const checkUserLayout = () => {
  // 检查用户端布局是否正确加载
  const userLayout = document.getElementById('user-layout')
  const appHeader = document.querySelector('.max-w-7xl')
  
  testResults.value.userLayoutLoaded = !!(userLayout && appHeader)
}

const checkAdminLayout = () => {
  router.push('/admin/dashboard')
}

const checkNoConflicts = () => {
  // 检查是否没有布局冲突
  const userLayout = document.getElementById('user-layout')
  const adminLayout = document.getElementById('admin-layout')
  
  // 应该只有一个布局存在
  testResults.value.noConflicts = !!(userLayout && !adminLayout) || (!userLayout && adminLayout)
}

const runAllTests = () => {
  checkUserLayout()
  checkNoConflicts()
}
</script>

<template>
  <div class="layout-test-page p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        布局分离测试页面
      </h1>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">当前布局状态</h2>
        
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="font-medium">用户端布局 (UserLayout)</span>
            <span :class="testResults.userLayoutLoaded ? 'text-green-600' : 'text-red-600'">
              {{ testResults.userLayoutLoaded ? '✓ 已加载' : '✗ 未加载' }}
            </span>
          </div>

          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="font-medium">无布局冲突</span>
            <span :class="testResults.noConflicts ? 'text-green-600' : 'text-red-600'">
              {{ testResults.noConflicts ? '✓ 无冲突' : '✗ 存在冲突' }}
            </span>
          </div>
        </div>

        <div class="mt-6 flex space-x-4">
          <button
            @click="runAllTests"
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            运行测试
          </button>
          
          <button
            @click="checkAdminLayout"
            class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            测试管理后台布局
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">布局分离说明</h2>
        
        <div class="space-y-4 text-gray-700 dark:text-gray-300">
          <div class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 class="font-semibold text-blue-800 dark:text-blue-300 mb-2">用户端布局 (UserLayout)</h3>
            <p>包含 AppHeader 和主内容区域，用于普通用户页面如首页、登录、注册、邮箱管理等。</p>
          </div>

          <div class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h3 class="font-semibold text-purple-800 dark:text-purple-300 mb-2">管理后台布局 (AdminLayout)</h3>
            <p>完全独立的管理后台布局，包含侧边栏、顶部导航和主内容区域，用于管理员功能。</p>
          </div>

          <div class="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 class="font-semibold text-green-800 dark:text-green-300 mb-2">App.vue 根组件</h3>
            <p>已简化为只包含 RouterView，不再有固定的头部，避免布局冲突。</p>
          </div>
        </div>
      </div>

      <div class="mt-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">
          当前页面使用的是 <strong>UserLayout</strong> 布局
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout-test-page {
  min-height: calc(100vh - 8rem);
}
</style>
