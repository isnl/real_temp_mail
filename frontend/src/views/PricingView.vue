<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePageTitle } from '@/composables/usePageTitle'
import { ElMessage } from 'element-plus'

// 设置页面标题
usePageTitle('配额购买')

const router = useRouter()
const authStore = useAuthStore()

const isLoggedIn = computed(() => authStore.isLoggedIn)

// 套餐数据
const plans = [
  {
    id: 'basic',
    name: '基础套餐',
    quota: 0,
    price: '免费',
    originalPrice: null,
    popular: false,
    description: '新用户专享',
    features: [
      '注册送5个配额',
      '每日签到送2个配额'
    ],
    buttonText: '每日签到获取',
    buttonColor: 'bg-blue-400 hover:bg-blue-500 text-white border-0',
    disabled: false
  },
  {
    id: 'starter',
    name: '入门套餐',
    quota: 50,
    bonusQuota: 10,
    price: '¥9.9',
    originalPrice: '¥19.9',
    popular: false,
    description: '小量使用首选',
    features: [
      '50个邮箱配额',
      '额外赠送10个配额'
    ],
    buttonText: '立即购买',
    buttonColor: 'bg-blue-400 hover:bg-blue-500 text-white border-0',
    disabled: false
  },
  {
    id: 'standard',
    name: '标准套餐',
    quota: 100,
    bonusQuota: 30,
    price: '¥19.9',
    originalPrice: '¥39.9',
    popular: true,
    description: '最受欢迎的选择',
    features: [
      '100个邮箱配额',
      '额外赠送30个配额'
    ],
    buttonText: '立即购买',
    buttonColor: 'bg-blue-400 hover:bg-blue-500 text-white border-0',
    disabled: false
  },
  {
    id: 'premium',
    name: '高级套餐',
    quota: 200,
    bonusQuota: 80,
    price: '¥39.9',
    originalPrice: '¥79.9',
    popular: false,
    description: '适合重度使用',
    features: [
      '200个邮箱配额',
      '额外赠送80个配额'
    ],
    buttonText: '立即购买',
    buttonColor: 'bg-blue-400 hover:bg-blue-500 text-white border-0',
    disabled: false
  },
  {
    id: 'pro',
    name: '专业套餐',
    quota: 500,
    bonusQuota: 200,
    price: '¥79.9',
    originalPrice: '¥159.9',
    popular: false,
    description: '专业用户专享',
    features: [
      '500个邮箱配额',
      '额外赠送200个配额'
    ],
    buttonText: '立即购买',
    buttonColor: 'bg-blue-400 hover:bg-blue-500 text-white border-0',
    disabled: false
  }
]

// FAQ数据
const faqs = [
  {
    question: '配额是什么？如何使用？',
    answer: '配额是创建临时邮箱的额度，每创建一个临时邮箱消耗1个配额。配额购买后永久有效，不会过期。'
  },
  {
    question: '购买后多久到账？',
    answer: '支付成功后配额会立即到账，您可以在个人中心查看配额余额。'
  },
  {
    question: '支持哪些支付方式？',
    answer: '目前支持微信支付、支付宝、银行卡等多种支付方式，安全便捷。'
  },
  {
    question: '配额可以退款吗？',
    answer: '由于配额为虚拟商品，一经购买不支持退款。请根据实际需求选择合适的套餐。'
  },
  {
    question: '如何选择合适的套餐？',
    answer: '建议根据您的使用频率选择：偶尔使用选择入门套餐，日常使用选择标准套餐，重度使用选择高级或专业套餐。'
  }
]

const handlePurchase = (plan: typeof plans[0]) => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再购买配额')
    router.push('/login')
    return
  }

  if (plan.id === 'basic') {
    router.push('/profile/checkin')
    return
  }

  // 这里可以集成支付接口
  ElMessage.info('开发中，敬请期待')
}

const goToLogin = () => {
  router.push('/login')
}

const goToRegister = () => {
  router.push('/register')
}
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

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="text-center">
          <!-- Icon -->
          <div class="flex justify-center mb-8">
            <div class="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <font-awesome-icon
                :icon="['fas', 'chart-pie']"
                class="text-white text-3xl"
              />
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            配额购买
          </h1>

          <p class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed">
            选择适合您的配额套餐
          </p>

          <p class="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            灵活的配额方案 · 永久有效 · 即买即用 · 安全支付
          </p>

          <!-- 登录提示 -->
          <div v-if="!isLoggedIn" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 max-w-2xl mx-auto mb-12">
            <div class="flex items-center justify-center mb-4">
              <font-awesome-icon :icon="['fas', 'info-circle']" class="text-blue-500 text-xl mr-2" />
              <span class="text-blue-700 dark:text-blue-300 font-semibold">购买前请先登录</span>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <el-button @click="goToLogin" type="primary" size="default">
                <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" />
                立即登录
              </el-button>
              <el-button @click="goToRegister" size="default">
                <font-awesome-icon :icon="['fas', 'user-plus']" class="mr-2" />
                注册账号
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 套餐选择 -->
    <section class="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            选择您的配额套餐
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            根据使用需求选择合适的配额方案，所有配额永久有效
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div
            v-for="plan in plans"
            :key="plan.id"
            :class="[
              'relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border h-full flex flex-col',
              plan.popular
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                : 'border-gray-200 dark:border-gray-700'
            ]"
          >
            <!-- 热门标签 -->
            <div v-if="plan.popular" class="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                最受欢迎
              </div>
            </div>

            <div class="p-8 flex flex-col h-full">
              <!-- 套餐名称 -->
              <div class="text-center mb-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {{ plan.name }}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 text-sm">
                  {{ plan.description }}
                </p>
              </div>

              <!-- 价格 -->
              <div class="text-center mb-6">
                <div class="flex items-center justify-center mb-2">
                  <span class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {{ plan.price }}
                  </span>
                  <span v-if="plan.originalPrice" class="ml-2 text-lg text-gray-500 line-through">
                    {{ plan.originalPrice }}
                  </span>
                </div>
                <div v-if="plan.quota > 0" class="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  <span v-if="plan.bonusQuota">
                    {{ plan.quota + plan.bonusQuota }} 个配额
                  </span>
                  <span v-else>
                    {{ plan.quota }} 个配额
                  </span>
                </div>
                <div v-else class="text-lg font-medium text-green-600 dark:text-green-400">
                  新用户福利
                </div>
                <!-- 赠送提示 -->
                <div v-if="plan.bonusQuota" class="text-sm text-orange-500 dark:text-orange-400 mt-1">
                  含赠送 {{ plan.bonusQuota }} 个
                </div>
              </div>

              <!-- 功能列表 -->
              <div class="mb-8 flex-grow">
                <ul class="space-y-3">
                  <li
                    v-for="feature in plan.features"
                    :key="feature"
                    class="flex items-center text-gray-600 dark:text-gray-400"
                  >
                    <font-awesome-icon
                      :icon="['fas', 'check']"
                      class="text-green-500 text-sm mr-3 flex-shrink-0"
                    />
                    <span class="text-sm">{{ feature }}</span>
                  </li>
                </ul>
              </div>

              <!-- 购买按钮 -->
              <div class="mt-auto">
                <button
                  @click="handlePurchase(plan)"
                  :disabled="plan.disabled || (!isLoggedIn && plan.id !== 'basic')"
                  :class="[
                    'w-full py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 hover:scale-102 shadow-sm hover:shadow-md',
                    plan.buttonColor,
                    (plan.disabled || (!isLoggedIn && plan.id !== 'basic'))
                      ? 'opacity-50 cursor-not-allowed hover:scale-100'
                      : 'cursor-pointer'
                  ]"
                >
                  {{ plan.buttonText }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-20 bg-white dark:bg-gray-900">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            常见问题
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-400">
            关于配额购买的常见疑问解答
          </p>
        </div>

        <div class="space-y-6">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              <font-awesome-icon :icon="['fas', 'question-circle']" class="text-blue-500 mr-2" />
              {{ faq.question }}
            </h3>
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed">
              {{ faq.answer }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-20 bg-gradient-to-r from-green-600 to-blue-600">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-6">
          还有疑问？
        </h2>
        <p class="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
          如果您有其他问题或需要定制化服务，欢迎联系我们的客服团队
        </p>

        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <el-button
            size="large"
            class="px-8 py-3 text-lg font-semibold bg-white text-green-600 hover:bg-gray-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <font-awesome-icon :icon="['fas', 'comments']" class="mr-2" />
            在线客服
          </el-button>

          <el-button
            size="large"
            class="px-8 py-3 text-lg font-semibold bg-transparent text-white border-2 border-white hover:bg-white hover:text-green-600 transition-all duration-300"
          >
            <font-awesome-icon :icon="['fas', 'envelope']" class="mr-2" />
            邮件咨询
          </el-button>
        </div>
      </div>
    </section>
  </div>
</template>
