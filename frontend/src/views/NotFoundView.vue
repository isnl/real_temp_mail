<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.back()
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center">
      <div class="mb-8">
        <font-awesome-icon 
          :icon="['fas', 'exclamation-triangle']" 
          class="text-6xl text-gray-400 dark:text-gray-600"
        />
      </div>
      
      <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        404
      </h1>
      
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8">
        抱歉，您访问的页面不存在
      </p>
      
      <div class="space-x-4">
        <el-button @click="goBack">
          返回上页
        </el-button>
        <el-button @click="goHome" type="primary">
          回到首页
        </el-button>
      </div>
    </div>
  </div>
</template>
