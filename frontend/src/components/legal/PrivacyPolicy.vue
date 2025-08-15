<script lang="ts" setup>
import { ref } from 'vue'

const visible = ref(false)

const open = () => {
  visible.value = true
}

const close = () => {
  visible.value = false
}

// 暴露方法给父组件
defineExpose({
  open,
  close
})

// 当前时间
const currentDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="隐私政策"
    width="80%"
    :close-on-click-modal="false"
    class="privacy-policy-dialog"
  >
    <div class="max-h-96 overflow-y-auto px-4">
      <div class="prose prose-sm max-w-none dark:prose-invert">
        <h2 class="text-xl font-bold mb-4">隐私政策</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          生效日期：{{ currentDate }}
        </p>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">1. 信息收集</h3>
          <p class="mb-3">
            我们致力于保护您的隐私。在您使用四欧临时邮箱（oooo.icu）服务时，我们可能收集以下信息：
          </p>
          <ul class="list-disc pl-6 space-y-2">
            <li>GitHub账户的公开信息（用户名、邮箱地址、头像等）</li>
            <li>您创建的临时邮箱地址信息</li>
            <li>接收到的邮件内容（仅用于向您展示）</li>
            <li>服务使用日志和统计信息</li>
            <li>设备信息和IP地址（用于安全防护）</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">2. 信息使用</h3>
          <p class="mb-3">我们收集的信息仅用于以下目的：</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>提供临时邮箱服务功能</li>
            <li>维护账户安全和服务稳定性</li>
            <li>改进服务质量和用户体验</li>
            <li>遵守法律法规要求</li>
            <li>防范欺诈和滥用行为</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">3. 信息保护</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>我们采用行业标准的安全措施保护您的个人信息</li>
            <li>所有数据传输均采用HTTPS加密</li>
            <li>严格限制员工对用户数据的访问权限</li>
            <li>定期进行安全审计和漏洞检测</li>
            <li>遵循数据最小化原则，只收集必要的信息</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">4. 信息共享</h3>
          <p class="mb-3">我们承诺不会出售、出租或以其他方式向第三方披露您的个人信息，除非：</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>获得您的明确同意</li>
            <li>适用法律法规要求或相关监管部门要求</li>
            <li>为保护我们、用户或公众的合法权益和安全</li>
            <li>为防止紧急情况下的人身伤害或财产损失</li>
            <li>为执行我们的服务条款或保护我们的知识产权</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">5. 数据保留</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>临时邮箱地址和邮件内容会在一定时间后自动删除</li>
            <li>账户信息在您主动删除账户后将被清除</li>
            <li>日志信息会定期清理，保留时间不超过必要期限</li>
            <li>我们会根据法律要求保留必要的数据</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">6. 您的权利</h3>
          <p class="mb-3">您对自己的个人信息享有以下权利：</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>查看和更新您的账户信息</li>
            <li>删除您的临时邮箱地址</li>
            <li>注销您的账户</li>
            <li>要求我们停止处理您的个人信息</li>
            <li>向相关监管部门投诉</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">7. 跨境数据传输</h3>
          <p class="mb-3">
            由于我们的服务可能涉及跨境数据传输，您的个人信息可能被传输到您所在国家/地区以外的地方进行处理和存储。
            我们会采取适当的安全措施确保您的数据在传输过程中得到保护，并遵守相关的数据保护法律。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">8. Cookie使用</h3>
          <p class="mb-3">
            我们使用Cookie和类似技术来改善用户体验，包括记住您的登录状态、
            偏好设置等。您可以通过浏览器设置管理Cookie。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">9. 法律合规</h3>
          <p class="mb-3">
            我们严格遵守服务运营所在地区的相关法律法规，包括但不限于网络安全、个人信息保护、数据安全等法律要求，确保用户数据处理的合法性和安全性。
          </p>
          <p class="mb-3 font-semibold text-red-600 dark:text-red-400">
            我们同时致力于遵守国际数据保护标准，如GDPR（欧盟通用数据保护条例）等，为全球用户提供一致的隐私保护水平。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">10. 政策更新</h3>
          <p class="mb-3">
            我们可能会不时更新本隐私政策。重大变更时，我们会通过网站公告等方式通知您。
            继续使用服务即表示您接受更新后的政策。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">11. 联系我们</h3>
          <p class="mb-3">
            如您对本隐私政策有任何疑问或建议，请发送邮件至 admin@oooo.icu 与我们联系。
            我们将在合理时间内回复您的询问。
          </p>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <el-button @click="close">我已阅读</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.privacy-policy-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.prose h3 {
  color: var(--el-text-color-primary);
}

.prose p, .prose li {
  color: var(--el-text-color-regular);
  line-height: 1.6;
}
</style>
