<script lang="ts" setup>
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()
</script>

<template>
  <div class="max-w-4xl mx-auto flex flex-col gap-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        服务条款
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        最后更新时间：2024年3月1日
      </p>
    </div>

    <div class="card-base p-8 flex flex-col gap-6">
      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          1. 服务说明
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-3">
          四欧临时邮箱（oooo.icu）为用户提供临时邮箱地址生成、邮件接收等功能。
          本服务旨在帮助用户保护隐私，避免垃圾邮件骚扰。
        </p>
        <p class="text-gray-600 dark:text-gray-400">
          通过注册或使用本服务，您同意遵守本服务条款的所有规定。
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          2. 用户责任与义务
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>用户在使用本服务时，必须遵守以下规定：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>遵守所在国家和地区的法律法规，不得利用本服务从事违法活动</li>
            <li>不得使用本服务进行垃圾邮件发送、网络攻击、诈骗等恶意行为</li>
            <li>不得滥用服务资源或进行自动化攻击</li>
            <li>保护账户安全，不得与他人共享账户信息</li>
            <li>尊重他人权益，不得侵犯他人隐私或知识产权</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          3. 服务限制
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>临时邮箱地址具有时效性，邮件可能在一定时间后被自动删除</li>
            <li>服务可能因维护、升级等原因暂时中断</li>
            <li>我们保留修改服务功能和使用条款的权利</li>
            <li>对于违反条款的用户，我们有权暂停或终止其服务</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          4. 隐私保护
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-3">
          我们承诺保护用户隐私，采用行业标准的安全措施保护用户数据。
          详细的隐私保护政策请参阅我们的隐私政策文档。
        </p>
        <p class="text-gray-600 dark:text-gray-400">
          我们不会主动查看或泄露用户的邮件内容，除非法律法规要求或为保护用户和公众安全。
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          5. 免责声明
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>本服务按"现状"提供，不提供任何明示或暗示的保证</li>
            <li>我们不对因使用本服务而导致的任何损失承担责任</li>
            <li>用户应自行承担使用本服务的风险</li>
            <li>我们不对第三方发送的邮件内容承担责任</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          6. 法律适用
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-3">
          本条款的解释和执行将根据服务提供方所在地的适用法律进行。
          如发生争议，应首先通过友好协商解决。
        </p>
        <p class="text-red-600 dark:text-red-400 font-semibold">
          用户必须遵守所在地区的法律法规，任何违法行为将由用户自行承担法律责任。
        </p>
      </section>
    </div>
  </div>
</template>
