<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

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

const goToPricing = () => {
  router.push('/pricing')
}

// 功能特性数据
const features = [
  {
    icon: 'shield-alt',
    title: '隐私保护',
    description: '无需提供真实邮箱，完全匿名使用，保护个人隐私安全'
  },
  {
    icon: 'bolt',
    title: '即时创建',
    description: '一键生成临时邮箱，支持多域名后缀，创建速度极快'
  },
  {
    icon: 'eye',
    title: '实时接收',
    description: '邮件实时推送，智能识别验证码，自动解析邮件内容'
  },
  {
    icon: 'mobile-alt',
    title: '响应式设计',
    description: '完美适配PC和移动设备，随时随地管理临时邮箱'
  },
  {
    icon: 'calendar-check',
    title: '签到奖励',
    description: '每日签到获得配额奖励，连续签到获得更多邮箱额度'
  },
  {
    icon: 'brain',
    title: '智能解析',
    description: '自动识别验证码、邮件类型检测、链接提取，智能化处理邮件内容'
  }
]

// 使用场景数据
const useCases = [
  {
    icon: 'user-shield',
    title: '账号注册',
    description: '注册各种网站服务时，避免主邮箱被垃圾邮件骚扰'
  },
  {
    icon: 'download',
    title: '软件下载',
    description: '下载软件资源时，获取验证码而不暴露真实邮箱'
  },
  {
    icon: 'gift',
    title: '活动参与',
    description: '参与各种在线活动、抽奖时，保护个人信息安全'
  },
  {
    icon: 'vial',
    title: '服务测试',
    description: '开发者测试邮件功能，或临时需要邮箱验证的场景'
  }
]

// 统计数据
const stats = [
  { number: '10000+', label: '用户信赖' },
  { number: '50000+', label: '邮件处理' },
  { number: '99.9%', label: '服务可用性' },
  { number: '24/7', label: '全天候服务' }
]
</script>

<template>
  <div class="h-full overflow-y-auto bg-white dark:bg-gray-900">
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <!-- 背景装饰 -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute -top-40 -right-32 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div class="text-center">
          <!-- Logo -->
          <div class="flex justify-center mb-8">
            <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <font-awesome-icon
                :icon="['fas', 'envelope']"
                class="text-white text-4xl"
              />
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-6">
            四欧临时邮箱管理系统
          </h1>

          <p class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            轻量级的现代化临时邮箱服务
          </p>

          <p class="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            保护隐私 · 即时创建 · 智能识别 · 安全可靠
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <el-button
              v-if="!isLoggedIn"
              @click="goToDashboard"
              type="primary"
              size="large"
              class="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'rocket']" class="mr-2" />
              立即开始使用
            </el-button>

            <el-button
              v-if="isLoggedIn"
              @click="goToDashboard"
              type="primary"
              size="large"
              class="px-10 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'tachometer-alt']" class="mr-2" />
              进入控制台
            </el-button>

            <el-button
              v-if="!isLoggedIn"
              @click="goToLogin"
              size="large"
              class="px-10 py-4 text-lg font-semibold border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" />
              已有账号登录
            </el-button>

            <el-button
              @click="goToPricing"
              size="large"
              class="px-10 py-4 text-lg font-semibold border-2 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="mr-2" />
              配额购买
            </el-button>
          </div>

          <!-- 统计数据 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div v-for="stat in stats" :key="stat.label" class="text-center">
              <div class="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {{ stat.number }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ stat.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能特性 -->
    <section class="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            强大功能特性
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            提供完整的临时邮箱解决方案，满足各种使用需求
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700"
          >
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
              <font-awesome-icon
                :icon="['fas', feature.icon]"
                class="text-white text-2xl"
              />
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {{ feature.title }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用场景 -->
    <section class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            适用场景
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            无论是个人使用还是开发测试，都能满足您的需求
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="useCase in useCases"
            :key="useCase.title"
            class="text-center p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
          >
            <div class="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <font-awesome-icon
                :icon="['fas', useCase.icon]"
                class="text-blue-600 dark:text-blue-400 text-2xl"
              />
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {{ useCase.title }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              {{ useCase.description }}
            </p>
          </div>
        </div>
      </div>
    </section>



    <!-- 系统特色 -->
    <section class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            系统特色
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            完整的功能体系，满足各种使用需求
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- 邮箱管理 -->
          <div class="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div class="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <font-awesome-icon :icon="['fas', 'envelope-open-text']" class="text-white text-2xl" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">智能邮箱管理</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>一键创建临时邮箱</div>
              <div>多域名后缀选择</div>
              <div>实时邮件接收</div>
              <div>验证码智能识别</div>
              <div>邮件导出和转发</div>
            </div>
          </div>

          <!-- 配额系统 -->
          <div class="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="text-white text-2xl" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">配额管理系统</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>每日签到获得配额</div>
              <div>兑换码充值系统</div>
              <div>配额使用记录</div>
              <div>连续签到奖励</div>
              <div>灵活的配额策略</div>
            </div>
          </div>

          <!-- 用户体验 -->
          <div class="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <div class="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <font-awesome-icon :icon="['fas', 'user-check']" class="text-white text-2xl" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">贴心服务</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>免费注册送配额</div>
              <div>每日签到领奖励</div>
              <div>兑换码快速充值</div>
              <div>暗色模式切换</div>
              <div>响应式界面设计</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl font-bold text-white mb-6">
          立即开始使用临时邮箱服务
        </h2>
        <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          注册即送5个邮箱配额，每日签到获得更多奖励，完全免费使用
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <el-button
            v-if="!isLoggedIn"
            @click="goToRegister"
            size="large"
            class="px-10 py-4 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <font-awesome-icon :icon="['fas', 'rocket']" class="mr-2" />
            免费注册使用
          </el-button>

          <el-button
            v-if="isLoggedIn"
            @click="goToDashboard"
            size="large"
            class="px-10 py-4 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <font-awesome-icon :icon="['fas', 'tachometer-alt']" class="mr-2" />
            进入控制台
          </el-button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <!-- Logo和描述 -->
          <div class="md:col-span-2">
            <div class="flex items-center mb-4">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-lg" />
              </div>
              <span class="text-xl font-bold">临时邮箱管理系统</span>
            </div>
            <p class="text-gray-400 mb-4 max-w-md">
              现代化临时邮箱服务，保护您的隐私，提供安全可靠的邮件接收体验。
            </p>
          </div>

          <!-- 功能特性 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">核心功能</h3>
            <div class="space-y-2 text-gray-400">
              <div>临时邮箱创建</div>
              <div>实时邮件接收</div>
              <div>验证码识别</div>
              <div>配额管理</div>
              <div>签到奖励</div>
            </div>
          </div>

          <!-- 联系方式 -->
          <div>
            <h3 class="text-lg font-semibold mb-4">联系我们</h3>
            <div class="space-y-3 text-gray-400">
              <div class="flex items-center">
                <font-awesome-icon :icon="['fas', 'envelope']" class="mr-2 text-blue-500" />
                <a href="mailto:admin@oooo.icu" class="hover:text-white transition-colors">
                  admin@oooo.icu
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 临时邮箱管理系统. 保护隐私，安全可靠.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
