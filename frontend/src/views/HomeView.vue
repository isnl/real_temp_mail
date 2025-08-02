<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoggedIn = computed(() => authStore.isLoggedIn)

const goToRegister = () => {
  router.push('/register')
}

const goToLogin = () => {
  router.push('/login')
}

const goToDashboard = () => {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
    <!-- Hero Section -->
    <div class="container-base py-20">
      <div class="text-center">
        <!-- Logo -->
        <div class="flex justify-center mb-8">
          <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center">
            <font-awesome-icon
              :icon="['fas', 'envelope']"
              class="text-white text-3xl"
            />
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          临时邮箱管理系统
        </h1>

        <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          安全、快速、免费的临时邮箱服务，保护您的隐私，避免垃圾邮件
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            v-if="!isLoggedIn"
            @click="goToRegister"
            class="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-lg font-medium"
          >
            <font-awesome-icon :icon="['fas', 'user-plus']" class="mr-2" />
            免费注册
          </button>

          <button
            v-if="isLoggedIn"
            @click="goToDashboard"
            class="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-lg font-medium"
          >
            <font-awesome-icon :icon="['fas', 'tachometer-alt']" class="mr-2" />
            进入控制台
          </button>

          <button
            v-if="!isLoggedIn"
            @click="goToLogin"
            class="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-lg font-medium"
          >
            <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" />
            立即登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
