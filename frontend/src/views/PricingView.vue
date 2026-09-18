<script lang="ts" setup>
import { computed } from 'vue'
import { usePageTitle } from '@/composables/usePageTitle'
import { usePublicSettings } from '@/composables/usePublicSettings'
import { isSafePricingLink } from '@/utils/pricing'

usePageTitle('价格')
const publicSettings = usePublicSettings()
void publicSettings.load().catch(() => undefined)
const plans = computed(() =>
  publicSettings.settings.value.pricing.plans.filter((plan) => plan.enabled),
)
const faqs = computed(() => publicSettings.settings.value.pricing.faqs)
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

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="text-center">
          <!-- Icon -->
          <div class="flex justify-center mb-8">
            <div
              class="w-20 h-20 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm"
            >
              <font-awesome-icon :icon="['fas', 'chart-pie']" class="text-white text-3xl" />
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">价格</h1>

          <p
            class="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto leading-relaxed"
          >
            选择适合您的配额套餐
          </p>

          <p class="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            方案清晰 · 兑换码补充 · 流水可查 · 联系管理员
          </p>
        </div>
      </div>
    </section>

    <!-- 套餐选择 -->
    <section class="py-20 bg-gray-50 dark:bg-gray-800/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">选择您的配额套餐</h2>
          <p class="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            根据使用需求选择合适的配额方案，具体有效期以发放说明为准
          </p>
        </div>

        <el-skeleton
          v-if="!publicSettings.loaded.value && publicSettings.loading.value"
          :rows="8"
          animated
        />
        <div v-else-if="publicSettings.error.value" class="pricing-load-error" role="alert">
          <p>价格内容暂时无法加载</p>
          <el-button @click="publicSettings.load(true).catch(() => undefined)">重新加载</el-button>
        </div>
        <el-empty v-else-if="!plans.length" description="暂无上架套餐" :image-size="80" />
        <div v-else class="pricing-plan-grid">
          <div
            v-for="plan in plans"
            :key="plan.id"
            :class="[
              'pricing-plan-card relative bg-white dark:bg-gray-800 rounded-2xl transition-colors duration-200 border h-full flex flex-col',
              plan.popular
                ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20'
                : 'border-gray-200 dark:border-gray-700',
            ]"
          >
            <!-- 热门标签 -->
            <div v-if="plan.popular" class="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div class="bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
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
                <div
                  v-if="plan.quota > 0"
                  class="text-2xl font-semibold text-primary-600 dark:text-primary-400"
                >
                  <span v-if="plan.bonusQuota"> {{ plan.quota + plan.bonusQuota }} 个配额 </span>
                  <span v-else> {{ plan.quota }} 个配额 </span>
                </div>
                <div v-else class="text-lg font-medium text-green-600 dark:text-green-400">
                  新用户福利
                </div>
                <!-- 赠送提示 -->
                <div
                  v-if="plan.bonusQuota"
                  class="text-sm text-orange-500 dark:text-orange-400 mt-1"
                >
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
                <router-link
                  v-if="
                    plan.buttonAction === 'link' &&
                    isSafePricingLink(plan.buttonUrl) &&
                    plan.buttonUrl.startsWith('/')
                  "
                  :to="plan.buttonUrl"
                  class="pricing-plan-button mint-solid-button"
                  >{{ plan.buttonText }}</router-link
                >
                <a
                  v-else-if="plan.buttonAction === 'link' && isSafePricingLink(plan.buttonUrl)"
                  :href="plan.buttonUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="pricing-plan-button mint-solid-button"
                  >{{ plan.buttonText }}</a
                >
                <span v-else class="pricing-plan-button pricing-plan-label mint-solid-button">{{
                  plan.buttonText
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section
      v-if="faqs.length && !publicSettings.error.value"
      class="py-20 bg-white dark:bg-gray-900"
    >
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">常见问题</h2>
          <p class="text-xl text-gray-600 dark:text-gray-400">关于配额购买的常见疑问解答</p>
        </div>

        <div class="space-y-6">
          <div
            v-for="faq in faqs"
            :key="faq.id"
            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              <font-awesome-icon :icon="['fas', 'question-circle']" class="text-primary-500 mr-2" />
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
    <section class="marketing-cta py-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-6">还有疑问？</h2>
        <p class="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
          如果您有其他问题或需要定制化服务，请联系本站管理员
        </p>

        <div class="flex justify-center">
          <p class="text-white">配额咨询与定制服务请联系本站管理员</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pricing-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 24px;
}
.pricing-plan-card {
  min-width: 0;
  overflow-wrap: anywhere;
}
.pricing-plan-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  overflow-wrap: anywhere;
  text-decoration: none;
}
.pricing-plan-label {
  cursor: default;
}
.pricing-load-error {
  display: grid;
  gap: 16px;
  justify-items: center;
  padding: 36px;
  color: var(--text-secondary);
}
</style>
