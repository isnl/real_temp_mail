<script lang="ts" setup>
import { useSiteBranding } from '@/composables/useSiteBranding'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePublicSettings } from '@/composables/usePublicSettings'

// 设置页面标题
usePageTitle()

const router = useRouter()
const authStore = useAuthStore()
const publicSettings = usePublicSettings()
void publicSettings.load().catch(() => undefined)

const isLoggedIn = computed(() => authStore.isLoggedIn)
const { siteName } = useSiteBranding()

const goToRegister = () => {
  router.push('/register')
}

const goToLogin = () => {
  router.push('/login')
}

const goToDashboard = () => {
  router.push('/profile')
}

const goToPricing = () => {
  router.push('/pricing')
}

// 功能特性数据
const features = [
  {
    icon: 'shield-alt',
    title: '隐私保护',
    description: '用临时地址隔离常用邮箱，减少在外部网站暴露长期联系方式',
  },
  {
    icon: 'bolt',
    title: '即时创建',
    description: '一键生成临时邮箱，支持多域名后缀，创建速度极快',
  },
  {
    icon: 'eye',
    title: '集中收件',
    description: '集中查看临时邮箱来信，刷新列表即可获取新邮件并识别常见验证码',
  },
  {
    icon: 'mobile-alt',
    title: '响应式设计',
    description: '针对桌面与移动设备优化布局，方便随时管理临时邮箱',
  },
  {
    icon: 'ticket',
    title: '灵活配额',
    description: '清晰查看配额变化，并可使用兑换码补充邮箱额度',
  },
  {
    icon: 'brain',
    title: '安全阅读',
    description: '自动识别常见验证码，并在隔离容器中展示邮件 HTML 内容',
  },
]

// 使用场景数据
const useCases = [
  {
    icon: 'user-shield',
    title: '账号注册',
    description: '注册各种网站服务时，避免主邮箱被垃圾邮件骚扰',
  },
  {
    icon: 'download',
    title: '软件下载',
    description: '下载软件资源时，获取验证码而不暴露真实邮箱',
  },
  {
    icon: 'gift',
    title: '活动参与',
    description: '参与各种在线活动、抽奖时，保护个人信息安全',
  },
  {
    icon: 'vial',
    title: '服务测试',
    description: '开发者测试邮件功能，或临时需要邮箱验证的场景',
  },
]

const stats = [
  { number: '一键', label: '快速创建邮箱' },
  { number: '多域名', label: '自由选择地址' },
  { number: '验证码', label: '自动识别提取' },
  { number: '多设备', label: '随时查看来信' },
]
</script>

<template>
  <div class="marketing-page bg-white dark:bg-gray-900">
    <!-- Hero Section -->
    <section class="marketing-hero relative overflow-hidden">
      <!-- 背景装饰 -->
      <div class="absolute inset-0 overflow-hidden">
        <div
          class="absolute -top-40 -right-32 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"
        ></div>
        <div
          class="absolute -bottom-40 -left-32 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"
        ></div>
      </div>

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div class="text-center">
          <!-- Logo -->
          <div class="flex justify-center mb-8">
            <div
              class="w-24 h-24 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm"
            >
              <font-awesome-icon :icon="['fas', 'envelope']" class="text-white text-4xl" />
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-5xl md:text-7xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            {{ siteName }}
          </h1>

          <p
            class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed"
          >
            轻量级的现代化临时邮箱服务
          </p>

          <p class="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            保护隐私 · 即时创建 · 智能识别 · 安全可靠
          </p>

          <!-- CTA Buttons -->
          <div class="marketing-actions flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <el-button
              v-if="!isLoggedIn && publicSettings.loading.value && !publicSettings.loaded.value"
              loading
              disabled
              size="large"
              class="px-10 py-4 text-lg font-semibold"
            >
              正在加载访问策略
            </el-button>

            <el-button
              v-if="
                !isLoggedIn &&
                publicSettings.loaded.value &&
                publicSettings.settings.value.registrationEnabled
              "
              @click="goToRegister"
              type="primary"
              size="large"
              class="px-10 py-4 text-lg font-semibold transition-colors duration-200"
            >
              <font-awesome-icon :icon="['fas', 'rocket']" class="mr-2" />
              免费创建账号
            </el-button>

            <el-button
              v-if="isLoggedIn"
              @click="goToDashboard"
              type="primary"
              size="large"
              class="px-10 py-4 text-lg font-semibold transition-colors duration-200"
            >
              <font-awesome-icon :icon="['fas', 'tachometer-alt']" class="mr-2" />
              进入控制台
            </el-button>

            <el-button
              v-if="!isLoggedIn && !publicSettings.loading.value"
              @click="goToLogin"
              :type="publicSettings.settings.value.registrationEnabled ? undefined : 'primary'"
              size="large"
              class="px-10 py-4 text-lg font-semibold border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" />
              已有账号登录
            </el-button>

            <el-button
              @click="goToPricing"
              size="large"
              class="px-10 py-4 text-lg font-semibold border-2 border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="mr-2" />
              价格
            </el-button>
          </div>

          <!-- 统计数据 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div v-for="stat in stats" :key="stat.label" class="text-center">
              <div
                class="text-3xl md:text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2"
              >
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
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">强大功能特性</h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            提供完整的临时邮箱解决方案，满足各种使用需求
          </p>
        </div>

        <div class="home-feature-grid grid grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="home-feature-card bg-white dark:bg-gray-800 p-8 rounded-2xl transition-colors duration-200 border border-gray-100 dark:border-gray-700"
          >
            <div class="w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center mb-6">
              <font-awesome-icon :icon="['fas', feature.icon]" class="text-white text-2xl" />
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
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">适用场景</h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            无论是个人使用还是开发测试，都能满足您的需求
          </p>
        </div>

        <div class="home-use-case-grid grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="useCase in useCases"
            :key="useCase.title"
            class="home-use-case-card text-center p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
          >
            <div
              class="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <font-awesome-icon
                :icon="['fas', useCase.icon]"
                class="text-primary-600 dark:text-primary-400 text-2xl"
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
          <h2 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">系统特色</h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            完整的功能体系，满足各种使用需求
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- 邮箱管理 -->
          <div
            class="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20"
          >
            <div
              class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <font-awesome-icon
                :icon="['fas', 'envelope-open-text']"
                class="text-white text-2xl"
              />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">智能邮箱管理</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>一键创建临时邮箱</div>
              <div>多域名后缀选择</div>
              <div>邮件集中接收</div>
              <div>验证码智能识别</div>
              <div>邮件导出和转发</div>
            </div>
          </div>

          <!-- 配额系统 -->
          <div
            class="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20"
          >
            <div
              class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="text-white text-2xl" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">配额管理系统</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>兑换码快速补充</div>
              <div>透明的余额统计</div>
              <div>配额使用记录</div>
              <div>新用户初始配额</div>
              <div>灵活的配额策略</div>
            </div>
          </div>

          <!-- 用户体验 -->
          <div
            class="text-center p-8 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20"
          >
            <div
              class="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <font-awesome-icon :icon="['fas', 'user-check']" class="text-white text-2xl" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">贴心服务</h3>
            <div class="text-gray-600 dark:text-gray-400 space-y-2 text-center">
              <div>账号初始配额</div>
              <div>兑换码灵活补充</div>
              <div>兑换码快速充值</div>
              <div>暗色模式切换</div>
              <div>响应式界面设计</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="marketing-cta py-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl font-bold text-white mb-6">立即开始使用临时邮箱服务</h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          {{
            publicSettings.settings.value.registrationEnabled
              ? '注册后即可集中管理临时邮箱'
              : '登录后即可集中管理临时邮箱'
          }}，配额余额与使用记录清晰可查
        </p>

        <div class="marketing-actions flex flex-col sm:flex-row gap-4 justify-center">
          <el-button
            v-if="!isLoggedIn && publicSettings.settings.value.registrationEnabled"
            @click="goToRegister"
            size="large"
            class="px-10 py-4 text-lg font-semibold mint-solid-button border-0 transition-colors duration-200"
          >
            <font-awesome-icon :icon="['fas', 'rocket']" class="mr-2" />
            免费注册使用
          </el-button>

          <el-button
            v-else-if="!isLoggedIn"
            type="primary"
            size="large"
            class="px-10 py-4 text-lg font-semibold mint-solid-button border-0 transition-colors duration-200"
            @click="goToLogin"
          >
            <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" />
            前往登录
          </el-button>

          <el-button
            v-if="isLoggedIn"
            @click="goToDashboard"
            size="large"
            class="px-10 py-4 text-lg font-semibold mint-solid-button border-0 transition-colors duration-200"
          >
            <font-awesome-icon :icon="['fas', 'tachometer-alt']" class="mr-2" />
            进入控制台
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>
