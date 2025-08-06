<script lang="ts" setup>
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="max-w-4xl mx-auto flex flex-col gap-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        隐私政策
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        最后更新时间：2024年3月1日
      </p>
    </div>

    <div class="card-base p-8 flex flex-col gap-6">
      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          1. 信息收集
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          我们仅收集必要的用户信息，包括邮箱地址和使用数据。
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          2. 信息使用
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          收集的信息仅用于提供服务，不会用于其他商业目的。
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          3. 信息保护
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          我们采用先进的加密技术保护用户数据安全。
        </p>
      </section>
    </div>
  </div>
</template>
