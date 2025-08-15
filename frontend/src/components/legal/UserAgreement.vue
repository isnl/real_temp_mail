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
    title="用户服务协议"
    width="80%"
    :close-on-click-modal="false"
    class="user-agreement-dialog"
  >
    <div class="max-h-96 overflow-y-auto px-4">
      <div class="prose prose-sm max-w-none dark:prose-invert">
        <h2 class="text-xl font-bold mb-4">用户服务协议</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          生效日期：{{ currentDate }}
        </p>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">1. 服务说明</h3>
          <p class="mb-3">
            欢迎使用四欧临时邮箱（oooo.icu）服务。本服务为用户提供临时邮箱地址生成、邮件接收等功能。
            通过注册或使用本服务，您同意遵守本协议的所有条款。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">2. 用户责任与义务</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>您必须遵守所在国家和地区的法律法规，不得利用本服务从事任何违法违规活动</li>
            <li>不得使用本服务进行垃圾邮件发送、网络攻击、诈骗、钓鱼等恶意行为</li>
            <li>不得滥用服务资源，包括但不限于恶意创建大量邮箱地址或进行自动化攻击</li>
            <li>您有责任保护自己的账户安全，不得与他人共享账户信息</li>
            <li>严格遵守所在地区的互联网相关法律法规，包括但不限于网络安全、数据保护、反垃圾邮件等法律</li>
            <li>不得使用本服务进行任何可能损害他人权益或违反国际互联网规范的行为</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">3. 服务限制</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>临时邮箱地址具有时效性，我们不保证邮件的永久存储</li>
            <li>服务可能因维护、升级等原因暂时中断</li>
            <li>我们保留在不通知的情况下修改服务功能的权利</li>
            <li>对于违反协议的用户，我们有权暂停或终止其服务</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">4. 免责声明</h3>
          <ul class="list-disc pl-6 space-y-2">
            <li>本服务按"现状"提供，不提供任何明示或暗示的保证</li>
            <li>我们不对因使用本服务而导致的任何直接或间接损失承担责任</li>
            <li>用户应自行承担使用本服务的风险</li>
            <li>我们不对第三方发送的邮件内容承担责任</li>
          </ul>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">5. 法律适用与争议解决</h3>
          <p class="mb-3">
            本协议的解释、效力及纠纷的解决，将根据服务提供方所在地的适用法律进行处理。
            如发生争议，应首先通过友好协商解决；协商不成的，可通过仲裁或向有管辖权的法院提起诉讼。
          </p>
          <p class="font-semibold text-red-600 dark:text-red-400">
            重要提醒：用户必须严格遵守所在国家和地区的法律法规，包括但不限于网络安全、数据保护、反垃圾邮件等相关法律。任何违法行为将由用户自行承担相应的法律责任。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">6. 协议修改</h3>
          <p class="mb-3">
            我们保留随时修改本协议的权利。修改后的协议将在网站上公布，
            继续使用服务即表示您接受修改后的协议。
          </p>
        </section>

        <section class="mb-6">
          <h3 class="text-lg font-semibold mb-3">7. 联系我们</h3>
          <p class="mb-3">
            如您对本协议有任何疑问，请发送邮件至 admin@oooo.icu 与我们联系。
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
.user-agreement-dialog :deep(.el-dialog__body) {
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
