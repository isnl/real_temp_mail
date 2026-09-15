<script lang="ts" setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardStats, type AdminDashboardStats } from '@/api/admin'
import AdminMetricCard from './AdminMetricCard.vue'

const loading = ref(true)
const stats = ref<AdminDashboardStats | null>(null)
const formatNumber = (value: number) => (Number.isFinite(value) ? value.toLocaleString() : '—')
const percentage = (value: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0
const healthLabel = computed(() =>
  stats.value?.systemHealth.status === 'healthy' ? '运行正常' : '需要关注',
)
const quotaPercent = computed(() =>
  stats.value
    ? percentage(
        stats.value.quotaDistribution.usedQuota,
        stats.value.quotaDistribution.totalQuota + stats.value.quotaDistribution.usedQuota,
      )
    : 0,
)

const loadStats = async () => {
  loading.value = true
  try {
    const response = await getDashboardStats()
    if (!response.success || !response.data) throw new Error(response.error || '获取统计数据失败')
    stats.value = response.data
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '获取统计数据失败')
  } finally {
    loading.value = false
  }
}
onMounted(loadStats)
</script>

<template>
  <div class="admin-module admin-dashboard">
    <div v-if="loading" class="admin-metric-grid" aria-label="正在加载统计数据">
      <div v-for="index in 8" :key="index" class="admin-metric-card">
        <el-skeleton animated :rows="3" />
      </div>
    </div>
    <template v-else-if="stats">
      <div class="dashboard-lead-grid">
        <article class="dashboard-mail-card">
          <div class="dashboard-mail-top">
            <span><font-awesome-icon icon="envelope-open" />今日收件</span
            ><span class="dashboard-period">今日</span>
          </div>
          <div class="dashboard-mail-value">
            {{ formatNumber(stats.emails.today) }}<span>封</span>
          </div>
          <div class="dashboard-mail-summary">
            <div>
              <span>本周收件</span><strong>{{ formatNumber(stats.emails.thisWeek) }}</strong>
            </div>
            <div>
              <span>本月收件</span><strong>{{ formatNumber(stats.emails.thisMonth) }}</strong>
            </div>
            <div>
              <span>累计收件</span><strong>{{ formatNumber(stats.emails.total) }}</strong>
            </div>
          </div>
        </article>
        <article class="dashboard-health-card">
          <div class="dashboard-health-heading">
            <span class="admin-metric-icon"><font-awesome-icon icon="shield-alt" /></span
            ><span>系统状态</span>
          </div>
          <strong
            class="dashboard-health-status"
            :class="stats.systemHealth.status === 'healthy' ? 'is-healthy' : 'is-warning'"
            ><span />{{ healthLabel }}</strong
          >
          <dl class="dashboard-health-details">
            <div>
              <dt>接口响应</dt>
              <dd>{{ formatNumber(stats.systemHealth.responseTime) }} <span>ms</span></dd>
            </div>
            <div>
              <dt>可用域名</dt>
              <dd>
                {{ formatNumber(stats.domains.active) }}
                <span>/ {{ formatNumber(stats.domains.total) }}</span>
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div class="admin-metric-grid">
        <AdminMetricCard
          label="用户总数"
          :value="stats.users.total"
          icon="users"
          :detail="`活跃 ${formatNumber(stats.users.active)} · 管理员 ${formatNumber(stats.users.admins)}`"
        />
        <AdminMetricCard
          label="临时邮箱"
          :value="stats.tempEmails.total"
          icon="envelope"
          tone="success"
          :detail="`可用邮箱 ${formatNumber(stats.tempEmails.active)}`"
        />
        <AdminMetricCard
          label="今日活跃用户"
          :value="stats.recentActivity.todayActiveUsers"
          icon="user-clock"
          :detail="`本周活跃 ${formatNumber(stats.recentActivity.weekActiveUsers)}`"
        />
        <AdminMetricCard
          label="今日新增用户"
          :value="stats.recentActivity.todayRegistrations"
          icon="user-plus"
          tone="warm"
          :detail="`本周新增 ${formatNumber(stats.recentActivity.weekRegistrations)}`"
        />
      </div>

      <div class="dashboard-detail-grid">
        <article class="dashboard-detail-card">
          <div class="dashboard-detail-heading">
            <span class="admin-metric-icon"><font-awesome-icon icon="chart-pie" /></span>
            <h3>邮箱配额</h3>
          </div>
          <div class="dashboard-quota-value">
            <strong>{{ formatNumber(stats.quotaDistribution.totalQuota) }}</strong
            ><span>剩余可用</span>
          </div>
          <el-progress :percentage="quotaPercent" :show-text="false" :stroke-width="8" />
          <div class="dashboard-progress-label">
            <span>已使用 {{ formatNumber(stats.quotaDistribution.usedQuota) }}</span
            ><span>{{ quotaPercent }}%</span>
          </div>
          <div class="dashboard-inline-stats">
            <div>
              <span>累计发放</span
              ><strong>{{ formatNumber(stats.quotaActivity.totalEarned) }}</strong>
            </div>
            <div>
              <span>累计消费</span
              ><strong>{{ formatNumber(stats.quotaActivity.totalConsumed) }}</strong>
            </div>
            <div>
              <span>人均剩余</span
              ><strong>{{
                formatNumber(Math.round(stats.quotaDistribution.averageQuotaPerUser))
              }}</strong>
            </div>
          </div>
        </article>
        <article class="dashboard-detail-card">
          <div class="dashboard-detail-heading">
            <span class="admin-metric-icon"><font-awesome-icon icon="ticket-alt" /></span>
            <h3>兑换码</h3>
          </div>
          <div class="dashboard-quota-value">
            <strong>{{ formatNumber(stats.redeemCodes.total) }}</strong
            ><span>累计创建</span>
          </div>
          <dl class="dashboard-code-stats">
            <div>
              <dt><i class="code-dot available" />未使用</dt>
              <dd>{{ formatNumber(stats.redeemCodes.unused) }}</dd>
            </div>
            <div>
              <dt><i class="code-dot used" />已使用</dt>
              <dd>{{ formatNumber(stats.redeemCodes.used) }}</dd>
            </div>
            <div>
              <dt><i class="code-dot expired" />已过期</dt>
              <dd>{{ formatNumber(stats.redeemCodes.expired) }}</dd>
            </div>
          </dl>
        </article>
      </div>
      <div class="dashboard-activity-strip">
        <div>
          <span class="admin-metric-icon"><font-awesome-icon icon="plus-circle" /></span
          ><span>今日获得配额</span
          ><strong>{{ formatNumber(stats.quotaActivity.todayEarned) }}</strong>
        </div>
        <div>
          <span class="admin-metric-icon"><font-awesome-icon icon="minus-circle" /></span
          ><span>今日消费配额</span
          ><strong>{{ formatNumber(stats.quotaActivity.todayConsumed) }}</strong>
        </div>
      </div>
    </template>
    <el-empty v-else description="无法加载统计数据"
      ><el-button type="primary" @click="loadStats">重试</el-button></el-empty
    >
  </div>
</template>
