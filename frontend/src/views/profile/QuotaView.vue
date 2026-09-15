<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { quotaApi, formatQuotaSource, formatQuotaType, getQuotaSourceIcon } from '@/api/quota'
import { useQuota } from '@/composables/useQuota'
import { usePageTitle } from '@/composables/usePageTitle'
import type { QuotaLog } from '@/types'

usePageTitle()

type QuotaTab = 'all' | 'permanent' | 'expiring' | 'expired'

const { quotaInfo, loading: quotaLoading, ready: quotaReady, fetchQuotaInfo } = useQuota()
const quotaLogs = ref<QuotaLog[]>([])
const logsLoading = ref(false)
const logsLoaded = ref(false)
const quotaTotal = ref(0)
const quotaPage = ref(1)
const quotaPageSize = 50
const activeTab = ref<QuotaTab>('all')
let logsRequestVersion = 0

const safeAmount = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.abs(Math.trunc(number))) : 0
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
}

const isQuotaExpired = (log: QuotaLog) => {
  if (!log.expires_at) return false
  const expiresAt = new Date(log.expires_at).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

const isQuotaExpiring = (log: QuotaLog) => {
  if (!log.expires_at) return false
  const expiresAt = new Date(log.expires_at).getTime()
  const now = Date.now()
  return Number.isFinite(expiresAt) && expiresAt > now && expiresAt <= now + 86_400_000
}

const filteredQuotaLogs = computed(() =>
  quotaLogs.value.filter((log) => {
    if (activeTab.value === 'all') return true
    if (log.type !== 'earn') return false
    if (activeTab.value === 'expired') return isQuotaExpired(log)
    if (activeTab.value === 'expiring') return isQuotaExpiring(log)
    return !log.expires_at
  }),
)

const quotaStats = computed(() =>
  quotaLogs.value.reduce(
    (stats, log) => {
      const bucket = log.type === 'earn' ? stats.earn : stats.use
      bucket.count += 1
      bucket.amount += safeAmount(log.amount)
      return stats
    },
    {
      earn: { count: 0, amount: 0 },
      use: { count: 0, amount: 0 },
    },
  ),
)

const sourceStats = computed(() => {
  const result = new Map<string, { count: number; amount: number }>()
  for (const log of quotaLogs.value) {
    const current = result.get(log.source) ?? { count: 0, amount: 0 }
    current.count += 1
    current.amount += safeAmount(log.amount)
    result.set(log.source, current)
  }
  return [...result.entries()]
    .map(([source, data]) => ({ source, name: formatQuotaSource(source), ...data }))
    .sort((left, right) => right.amount - left.amount)
})

const usagePercent = computed(() => {
  if (quotaInfo.value.total <= 0) return 0
  return Math.min(
    100,
    Math.max(0, Math.round((quotaInfo.value.used / quotaInfo.value.total) * 100)),
  )
})

const overviewCards = computed(() => [
  {
    key: 'remaining',
    label: '剩余配额',
    value: quotaInfo.value.remaining,
    icon: 'inbox',
    tone: 'cyan',
  },
  {
    key: 'used',
    label: '已使用',
    value: quotaInfo.value.used,
    icon: 'arrow-trend-up',
    tone: 'amber',
  },
  {
    key: 'total',
    label: '累计有效配额',
    value: quotaInfo.value.total,
    icon: 'layer-group',
    tone: 'teal',
  },
  {
    key: 'expired',
    label: '已过期',
    value: quotaInfo.value.expired ?? 0,
    icon: 'clock-rotate-left',
    tone: 'slate',
  },
])

const loadQuotaLogs = async (reset = true) => {
  if (logsLoading.value) return
  const requestVersion = ++logsRequestVersion
  const requestedPage = reset ? 1 : quotaPage.value + 1
  logsLoading.value = true

  try {
    const response = await quotaApi.getQuotaLogs(requestedPage, quotaPageSize)
    if (requestVersion !== logsRequestVersion) return
    if (!response.success || !response.data) throw new Error(response.error || '加载配额记录失败')

    const incoming = response.data.logs ?? []
    if (reset) {
      quotaLogs.value = incoming
    } else {
      const existingIds = new Set(quotaLogs.value.map((log) => log.id))
      quotaLogs.value = [...quotaLogs.value, ...incoming.filter((log) => !existingIds.has(log.id))]
    }
    quotaPage.value = requestedPage
    quotaTotal.value = Math.max(0, Number(response.data.total) || 0)
    logsLoaded.value = true
  } catch (error) {
    if (requestVersion === logsRequestVersion) {
      ElMessage.error(error instanceof Error ? error.message : '加载配额记录失败')
    }
  } finally {
    if (requestVersion === logsRequestVersion) logsLoading.value = false
  }
}

onMounted(() => {
  void Promise.allSettled([fetchQuotaInfo(), loadQuotaLogs(true)])
})
</script>

<template>
  <div class="quota-page">
    <div
      v-if="quotaLoading && !quotaReady"
      class="quota-overview-grid"
      aria-label="正在加载配额概览"
    >
      <div v-for="index in 4" :key="index" class="metric-card metric-card-skeleton">
        <el-skeleton animated>
          <template #template>
            <div class="metric-skeleton-row">
              <el-skeleton-item variant="circle" class="metric-skeleton-icon" />
              <div class="metric-skeleton-copy">
                <el-skeleton-item variant="text" style="width: 46%" />
                <el-skeleton-item variant="h1" style="width: 68%" />
              </div>
            </div>
          </template>
        </el-skeleton>
      </div>
    </div>

    <div v-else class="quota-overview-grid">
      <article
        v-for="card in overviewCards"
        :key="card.key"
        class="metric-card"
        :data-tone="card.tone"
      >
        <div class="metric-icon" aria-hidden="true">
          <font-awesome-icon :icon="['fas', card.icon]" />
        </div>
        <div>
          <p>{{ card.label }}</p>
          <strong>{{ card.value.toLocaleString('zh-CN') }}</strong>
        </div>
      </article>
    </div>

    <section
      v-if="quotaLoading && !quotaReady"
      class="quota-usage-card"
      aria-label="正在加载配额使用率"
    >
      <el-skeleton :rows="3" animated />
    </section>

    <section v-else class="quota-usage-card" aria-labelledby="usage-title">
      <div>
        <p class="page-eyebrow">Usage</p>
        <h3 id="usage-title">配额使用率</h3>
        <p>
          已使用 {{ quotaInfo.used.toLocaleString('zh-CN') }}，剩余
          {{ quotaInfo.remaining.toLocaleString('zh-CN') }}
        </p>
      </div>
      <div class="quota-progress-copy">
        <strong>{{ usagePercent }}%</strong><span>已使用</span>
      </div>
      <el-progress :percentage="usagePercent" :show-text="false" :stroke-width="10" />
    </section>

    <div v-if="quotaReady && (quotaInfo.expiring ?? 0) > 0" class="quota-warning" role="status">
      <font-awesome-icon :icon="['fas', 'triangle-exclamation']" />
      <div>
        <strong>有 {{ quotaInfo.expiring }} 个配额将在 24 小时内过期</strong>
        <p>建议优先使用临近到期的配额创建临时邮箱。</p>
      </div>
    </div>

    <div
      v-if="logsLoading && !logsLoaded"
      class="quota-insights-grid"
      aria-label="正在加载配额统计"
    >
      <section v-for="index in 2" :key="index" class="surface-card">
        <el-skeleton :rows="4" animated />
      </section>
    </div>

    <div v-else class="quota-insights-grid">
      <section class="surface-card">
        <header class="section-heading">
          <div>
            <p class="page-eyebrow">Loaded records</p>
            <h3>已加载记录统计</h3>
          </div>
        </header>
        <div class="quota-stat-pair">
          <div>
            <span class="quota-stat-icon success"
              ><font-awesome-icon :icon="['fas', 'plus']"
            /></span>
            <p>获得配额</p>
            <strong>+{{ quotaStats.earn.amount.toLocaleString('zh-CN') }}</strong
            ><small>{{ quotaStats.earn.count }} 笔</small>
          </div>
          <div>
            <span class="quota-stat-icon warning"
              ><font-awesome-icon :icon="['fas', 'minus']"
            /></span>
            <p>使用配额</p>
            <strong>-{{ quotaStats.use.amount.toLocaleString('zh-CN') }}</strong
            ><small>{{ quotaStats.use.count }} 笔</small>
          </div>
        </div>
      </section>

      <section class="surface-card">
        <header class="section-heading">
          <div>
            <p class="page-eyebrow">Sources</p>
            <h3>配额来源</h3>
          </div>
        </header>
        <div v-if="sourceStats.length" class="quota-source-list">
          <div v-for="stat in sourceStats.slice(0, 5)" :key="stat.source">
            <span><font-awesome-icon :icon="['fas', getQuotaSourceIcon(stat.source)]" /></span>
            <div>
              <strong>{{ stat.name }}</strong
              ><small>{{ stat.count }} 笔记录</small>
            </div>
            <b>{{ stat.amount.toLocaleString('zh-CN') }}</b>
          </div>
        </div>
        <el-empty v-else :image-size="56" description="暂无来源统计" />
      </section>
    </div>

    <section class="surface-card quota-history">
      <header class="section-heading quota-history-heading">
        <div>
          <p class="page-eyebrow">History</p>
          <h3>配额记录</h3>
        </div>
        <span v-if="logsLoaded" class="record-count"
          >共 {{ quotaTotal.toLocaleString('zh-CN') }} 笔</span
        >
      </header>

      <el-tabs v-model="activeTab" class="quota-tabs">
        <el-tab-pane label="全部记录" name="all" />
        <el-tab-pane label="永不过期" name="permanent" />
        <el-tab-pane label="即将过期" name="expiring" />
        <el-tab-pane label="已过期" name="expired" />
      </el-tabs>

      <div
        v-if="logsLoading && !logsLoaded"
        class="quota-log-skeletons"
        aria-label="正在加载配额记录"
      >
        <el-skeleton v-for="index in 5" :key="index" :rows="2" animated />
      </div>

      <el-empty
        v-else-if="!filteredQuotaLogs.length"
        :image-size="72"
        :description="activeTab === 'all' ? '暂无配额记录' : '当前分类暂无记录'"
      />

      <div v-else class="quota-log-list">
        <article
          v-for="log in filteredQuotaLogs"
          :key="log.id"
          :class="{ expired: isQuotaExpired(log), expiring: isQuotaExpiring(log) }"
        >
          <div class="quota-log-icon" :data-type="log.type">
            <font-awesome-icon :icon="['fas', getQuotaSourceIcon(log.source)]" />
          </div>
          <div class="quota-log-copy">
            <strong>{{ log.description || formatQuotaSource(log.source) }}</strong>
            <span>{{ formatDateTime(log.created_at) }}</span>
            <small v-if="log.type === 'earn'">
              <template v-if="!log.expires_at">永不过期</template>
              <template v-else-if="isQuotaExpired(log)"
                >已于 {{ formatDateTime(log.expires_at) }} 过期</template
              >
              <template v-else>有效期至 {{ formatDateTime(log.expires_at) }}</template>
            </small>
          </div>
          <div class="quota-log-value" :data-type="log.type">
            <strong>{{ log.type === 'earn' ? '+' : '-' }}{{ safeAmount(log.amount) }}</strong>
            <span>{{ formatQuotaType(log.type) }}</span>
          </div>
        </article>
      </div>

      <div v-if="quotaTotal > quotaLogs.length" class="load-more-row">
        <el-button :loading="logsLoading" @click="loadQuotaLogs(false)">
          加载更多（{{ quotaLogs.length }}/{{ quotaTotal }}）
        </el-button>
      </div>
    </section>
  </div>
</template>
