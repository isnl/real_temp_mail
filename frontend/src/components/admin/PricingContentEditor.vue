<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PricingContent, PricingPlan } from '@/types'
import type { PricingPart } from '@/utils/pricing'

const props = defineProps<{ modelValue: string; part: PricingPart; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const content = ref<PricingContent>({ plans: [], faqs: [] })
const openPlan = ref('')
const openFaq = ref('')
const parseError = ref(false)
let emittedValue = ''

watch(
  () => props.modelValue,
  (value) => {
    if (value === emittedValue) return
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) throw new Error('invalid')
      content.value = {
        plans: props.part === 'plans' ? parsed : [],
        faqs: props.part === 'faqs' ? parsed : [],
      }
      parseError.value = false
    } catch {
      parseError.value = true
    }
  },
  { immediate: true },
)

watch(
  content,
  (value) => {
    if (parseError.value) return
    emittedValue = JSON.stringify(
      props.part === 'plans'
        ? value.plans.map((plan) => ({
            ...plan,
            features: plan.features.filter((feature) => feature.trim()),
          }))
        : value.faqs,
    )
    emit('update:modelValue', emittedValue)
  },
  { deep: true },
)

const addPlan = () => {
  const id = crypto.randomUUID()
  content.value.plans.push({
    id,
    name: '新套餐',
    description: '',
    price: '',
    originalPrice: '',
    quota: 0,
    bonusQuota: 0,
    popular: false,
    enabled: true,
    features: [],
    buttonText: '咨询购买',
    buttonAction: 'text',
    buttonUrl: '',
  })
  openPlan.value = id
}
const addFaq = () => {
  const id = crypto.randomUUID()
  content.value.faqs.push({ id, question: '', answer: '' })
  openFaq.value = id
}
const move = <T,>(items: T[], index: number, direction: number) => {
  const next = index + direction
  if (next < 0 || next >= items.length) return
  const [item] = items.splice(index, 1)
  items.splice(next, 0, item)
}
const setButtonAction = (plan: PricingPlan, value: string | number | boolean | undefined) => {
  plan.buttonAction = value === 'link' ? 'link' : 'text'
  if (plan.buttonAction === 'text') plan.buttonUrl = ''
}
</script>

<template>
  <div class="pricing-editor">
    <el-alert
      v-if="parseError"
      title="价格内容加载失败，请重新打开设置"
      type="error"
      :closable="false"
    />
    <template v-else>
      <div v-if="part === 'plans'">
        <div class="pricing-editor-toolbar">
          <el-button
            type="primary"
            :disabled="disabled || content.plans.length >= 20"
            @click="addPlan"
            ><font-awesome-icon icon="plus" />新增套餐</el-button
          >
        </div>
        <el-empty v-if="!content.plans.length" description="暂无套餐" :image-size="60" />
        <el-collapse v-model="openPlan" accordion>
          <el-collapse-item v-for="(plan, index) in content.plans" :key="plan.id" :name="plan.id">
            <template #title>
              <div class="pricing-editor-summary">
                <strong>{{ plan.name || '新套餐' }}</strong
                ><span>{{ plan.price }}</span
                ><el-tag v-if="!plan.enabled" size="small" type="info">已下架</el-tag
                ><el-tag v-else-if="plan.popular" size="small">推荐</el-tag>
              </div>
            </template>
            <div class="pricing-editor-row-actions">
              <el-button
                :disabled="disabled || index === 0"
                @click="move(content.plans, index, -1)"
                :aria-label="`上移套餐 ${plan.name}`"
                >上移</el-button
              >
              <el-button
                :disabled="disabled || index === content.plans.length - 1"
                @click="move(content.plans, index, 1)"
                :aria-label="`下移套餐 ${plan.name}`"
                >下移</el-button
              >
              <el-button
                type="danger"
                plain
                :disabled="disabled"
                @click="content.plans.splice(index, 1)"
                :aria-label="`移除套餐 ${plan.name}`"
                >移除</el-button
              >
            </div>
            <el-form label-position="top" :disabled="disabled" class="pricing-editor-grid">
              <el-form-item label="套餐名称" class="pricing-editor-wide" required
                ><el-input v-model="plan.name" maxlength="60"
              /></el-form-item>
              <el-form-item label="套餐说明" class="pricing-editor-wide"
                ><el-input v-model="plan.description" maxlength="200"
              /></el-form-item>
              <el-form-item label="展示价格" required
                ><el-input v-model="plan.price" maxlength="40" placeholder="¥9.9"
              /></el-form-item>
              <el-form-item label="原价"
                ><el-input v-model="plan.originalPrice" maxlength="40" placeholder="可不填写"
              /></el-form-item>
              <el-form-item label="基础配额"
                ><el-input-number
                  v-model="plan.quota"
                  :min="0"
                  :max="1000000"
                  :precision="0"
                  controls-position="right"
              /></el-form-item>
              <el-form-item label="赠送配额"
                ><el-input-number
                  v-model="plan.bonusQuota"
                  :min="0"
                  :max="1000000"
                  :precision="0"
                  controls-position="right"
              /></el-form-item>
              <el-form-item label="上架展示"
                ><el-switch v-model="plan.enabled" active-text="开启"
              /></el-form-item>
              <el-form-item label="推荐套餐"
                ><el-switch v-model="plan.popular" active-text="推荐"
              /></el-form-item>
              <el-form-item label="套餐权益" class="pricing-editor-wide"
                ><el-input
                  type="textarea"
                  :rows="3"
                  :model-value="plan.features.join('\n')"
                  @update:model-value="plan.features = String($event).split('\n')"
                  placeholder="每行一条权益"
                  maxlength="4000"
              /></el-form-item>
              <el-form-item label="按钮文字" class="pricing-editor-wide" required
                ><el-input v-model="plan.buttonText" maxlength="40" placeholder="咨询购买"
              /></el-form-item>
              <el-form-item label="按钮方式" class="pricing-editor-wide"
                ><el-radio-group
                  :model-value="plan.buttonAction"
                  @update:model-value="setButtonAction(plan, $event)"
                  ><el-radio-button value="text">仅展示文字</el-radio-button
                  ><el-radio-button value="link">跳转链接</el-radio-button></el-radio-group
                ></el-form-item
              >
              <el-form-item
                v-if="plan.buttonAction === 'link'"
                label="跳转链接"
                class="pricing-editor-wide"
                required
                ><el-input
                  v-model="plan.buttonUrl"
                  maxlength="1024"
                  placeholder="https://example.com 或 /profile/quota"
              /></el-form-item>
            </el-form>
          </el-collapse-item>
        </el-collapse>
      </div>
      <div v-else>
        <div class="pricing-editor-toolbar">
          <el-button
            type="primary"
            :disabled="disabled || content.faqs.length >= 30"
            @click="addFaq"
            ><font-awesome-icon icon="plus" />新增问题</el-button
          >
        </div>
        <el-empty v-if="!content.faqs.length" description="暂无常见问题" :image-size="60" />
        <el-collapse v-model="openFaq" accordion>
          <el-collapse-item
            v-for="(faq, index) in content.faqs"
            :key="faq.id"
            :name="faq.id"
            :title="faq.question || '新问题'"
          >
            <div class="pricing-editor-row-actions">
              <el-button
                :disabled="disabled || index === 0"
                @click="move(content.faqs, index, -1)"
                aria-label="上移问题"
                >上移</el-button
              >
              <el-button
                :disabled="disabled || index === content.faqs.length - 1"
                @click="move(content.faqs, index, 1)"
                aria-label="下移问题"
                >下移</el-button
              >
              <el-button
                type="danger"
                plain
                :disabled="disabled"
                @click="content.faqs.splice(index, 1)"
                aria-label="移除问题"
                >移除</el-button
              >
            </div>
            <el-form label-position="top" :disabled="disabled">
              <el-form-item label="问题" required
                ><el-input v-model="faq.question" maxlength="160"
              /></el-form-item>
              <el-form-item label="回答" required
                ><el-input v-model="faq.answer" type="textarea" :rows="4" maxlength="2000"
              /></el-form-item>
            </el-form>
          </el-collapse-item>
        </el-collapse>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pricing-editor {
  min-width: 0;
}
.pricing-editor-toolbar {
  display: flex;
  justify-content: flex-end;
  margin: 6px 0 18px;
}
.pricing-editor-toolbar svg {
  margin-right: 8px;
}
.pricing-editor-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  min-width: 0;
  padding-block: 12px;
  text-align: left;
  line-height: 1.5;
}
.pricing-editor-summary strong {
  overflow-wrap: anywhere;
}
.pricing-editor-summary > span {
  color: var(--text-secondary);
}
.pricing-editor-row-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin: 12px 0 20px;
}
.pricing-editor-row-actions .el-button {
  margin: 0;
}
.pricing-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}
.pricing-editor-wide {
  grid-column: 1 / -1;
}
.pricing-editor :deep(.el-collapse-item__header) {
  height: auto;
  min-height: 56px;
}
.pricing-editor :deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}
.pricing-editor :deep(.el-input-number) {
  width: 100%;
}
.pricing-editor :deep(.el-form-item) {
  min-width: 0;
}
@media (max-width: 700px) {
  .pricing-editor-grid {
    gap: 0 12px;
  }
  .pricing-editor :deep(.el-radio-button__inner) {
    padding: 12px;
  }
  .pricing-editor :deep(.el-form-item__label) {
    font-size: 13px;
  }
}
</style>
