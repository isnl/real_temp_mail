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
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>我们致力于保护您的隐私。在您使用四欧临时邮箱服务时，我们可能收集以下信息：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>GitHub账户的公开信息（用户名、邮箱地址、头像等）</li>
            <li>您创建的临时邮箱地址信息</li>
            <li>接收到的邮件内容（仅用于向您展示）</li>
            <li>服务使用日志和统计信息</li>
            <li>设备信息和IP地址（用于安全防护）</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          2. 信息使用
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>我们收集的信息仅用于以下目的：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>提供临时邮箱服务功能</li>
            <li>维护账户安全和服务稳定性</li>
            <li>改进服务质量和用户体验</li>
            <li>遵守法律法规要求</li>
            <li>防范欺诈和滥用行为</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          3. 信息保护
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>我们采用多重安全措施保护您的个人信息：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>所有数据传输均采用HTTPS加密</li>
            <li>严格限制员工对用户数据的访问权限</li>
            <li>定期进行安全审计和漏洞检测</li>
            <li>遵循数据最小化原则，只收集必要的信息</li>
            <li>采用行业标准的数据存储和处理技术</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          4. 信息共享
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>我们承诺不会出售、出租或向第三方披露您的个人信息，除非：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>获得您的明确同意</li>
            <li>适用法律法规要求或相关监管部门要求</li>
            <li>为保护我们、用户或公众的合法权益和安全</li>
            <li>为防止紧急情况下的人身伤害或财产损失</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          5. 您的权利
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>您对自己的个人信息享有以下权利：</p>
          <ul class="list-disc pl-6 flex flex-col gap-2">
            <li>查看和更新您的账户信息</li>
            <li>删除您的临时邮箱地址</li>
            <li>注销您的账户</li>
            <li>要求我们停止处理您的个人信息</li>
            <li>向相关监管部门投诉</li>
          </ul>
        </div>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          6. 国际数据传输
        </h2>
        <p class="text-gray-600 dark:text-gray-400">
          由于我们的服务可能涉及跨境数据传输，您的个人信息可能被传输到您所在国家/地区以外的地方进行处理和存储。
          我们会采取适当的安全措施确保您的数据在传输过程中得到保护，并遵守相关的数据保护法律。
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          7. 法律合规
        </h2>
        <div class="text-gray-600 dark:text-gray-400 flex flex-col gap-3">
          <p>
            我们严格遵守服务运营所在地区的相关法律法规，包括但不限于网络安全、个人信息保护、数据安全等法律要求。
          </p>
          <p class="text-red-600 dark:text-red-400 font-semibold">
            我们同时致力于遵守国际数据保护标准，如GDPR（欧盟通用数据保护条例）等，为全球用户提供一致的隐私保护水平。
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
