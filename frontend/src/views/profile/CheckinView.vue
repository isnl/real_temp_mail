<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { checkinApi, type CheckinHistory, type CheckinStats } from '@/api/checkin'
import type { CheckinStatus } from '@/types'
import dayjs from 'dayjs'
import { usePageTitle } from '@/composables/usePageTitle'

// 设置页面标题
usePageTitle()

const authStore = useAuthStore()

// 当前查看的年月
const currentYear = ref(dayjs().year())
const currentMonth = ref(dayjs().month() + 1) // dayjs月份从0开始，需要+1

// 签到状态
const checkinStatus = ref<CheckinStatus>({
  hasCheckedIn: false,
  checkinRecord: undefined,
  nextCheckinTime: '',
})

// 签到统计
const checkinStats = ref<CheckinStats>({
  totalCheckins: 0,
  currentStreak: 0,
  longestStreak: 0,
  thisMonthCheckins: 0,
})



// 签到历史
const checkinHistory = ref<CheckinHistory[]>([])

// 签到日历
const calendarData = ref<
  Array<{
    date: string
    checked: boolean
    reward?: number
    isCurrentMonth: boolean
    isToday?: boolean
  }>
>([])

const loading = ref(false)
const checkinLoading = ref(false)

// 监听年月变化，重新生成日历
watch(
  [currentYear, currentMonth],
  () => {
    generateCalendarData()
  },
  { immediate: false },
)

onMounted(async () => {
  await loadCheckinData()
})

// 加载签到数据
const loadCheckinData = async () => {
  loading.value = true
  try {
    // 并行加载所有数据
    const [statusRes, statsRes, historyRes] = await Promise.all([
      checkinApi.getCheckinStatus(),
      checkinApi.getCheckinStats(),
      checkinApi.getCheckinHistory(30),
    ])

    if (statusRes.success && statusRes.data) {
      checkinStatus.value = statusRes.data
    }

    if (statsRes.success && statsRes.data) {
      checkinStats.value = statsRes.data
    }

    if (historyRes.success && historyRes.data) {
      checkinHistory.value = historyRes.data
    }

    // 生成日历数据
    generateCalendarData()
  } catch (error) {
    console.error('Load checkin data error:', error)
    ElMessage.error('加载签到数据失败')
  } finally {
    loading.value = false
  }
}

// 生成日历数据
const generateCalendarData = () => {
  const targetDate = dayjs()
    .year(currentYear.value)
    .month(currentMonth.value - 1)
  const today = dayjs()

  // 获取当月第一天和最后一天
  const firstDay = targetDate.startOf('month')
  const lastDay = targetDate.endOf('month')

  // 获取第一天是星期几
  const startWeekday = firstDay.day()

  const calendar = []

  // 添加上个月的日期（填充）
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = firstDay.subtract(i + 1, 'day')
    calendar.push({
      date: date.format('YYYY-MM-DD'),
      checked: false,
      isCurrentMonth: false,
    })
  }

  // 添加当月的日期
  for (let day = 1; day <= lastDay.date(); day++) {
    const date = targetDate.date(day)
    const dateStr = date.format('YYYY-MM-DD')

    // 检查是否已签到（从历史记录中查找）
    const isChecked = checkinHistory.value.some(
      (record) => dayjs(record.checkin_date).format('YYYY-MM-DD') === dateStr,
    )

    calendar.push({
      date: dateStr,
      checked: isChecked,
      isCurrentMonth: true,
      isToday: dateStr === today.format('YYYY-MM-DD'),
    })
  }

  calendarData.value = calendar
}

// 上一个月
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

// 下一个月
const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// 当前月份显示文本
const currentMonthText = computed(() => {
  return dayjs()
    .year(currentYear.value)
    .month(currentMonth.value - 1)
    .format('YYYY年MM月')
})

// 开始签到流程
const doCheckin = async () => {
  if (checkinStatus.value.hasCheckedIn) {
    ElMessage.warning('今天已经签到过了')
    return
  }

  checkinLoading.value = true
  try {
    const response = await checkinApi.checkin({})

    if (response.success && response.data) {
      ElMessage.success(response.data.message)

      // 重新加载数据
      await loadCheckinData()

      // 刷新用户信息
      await authStore.fetchCurrentUser()
    } else {
      ElMessage.error(response.error || '签到失败')
    }
  } catch (error: any) {
    console.error('Checkin error:', error)
    ElMessage.error(error.message || '签到失败，请重试')
  } finally {
    checkinLoading.value = false
  }
}



// 格式化日期
const formatDate = (dateStr: string) => {
  return dayjs(dateStr).format('MM月DD日')
}

// 获取星期几
const getWeekdays = () => {
  return ['日', '一', '二', '三', '四', '五', '六']
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex gap-6">
      <!-- 签到状态卡片 -->
      <div class="card-base flex-1 p-6">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">每日签到</h2>
            <p class="text-gray-600 dark:text-gray-400 mt-1">坚持签到，获得更多邮箱配额</p>
          </div>
          <el-button
            type="primary"
            size="large"
            @click="doCheckin"
            :loading="checkinLoading"
            :disabled="checkinStatus.hasCheckedIn"
          >
            <font-awesome-icon
              :icon="['fas', checkinStatus.hasCheckedIn ? 'check' : 'calendar-plus']"
              class="mr-2"
            />
            {{ checkinStatus.hasCheckedIn ? '今日已签到' : '立即签到' }}
          </el-button>
        </div>

        <!-- 签到统计 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div class="flex items-center space-x-3">
              <font-awesome-icon
                :icon="['fas', 'fire']"
                class="text-blue-600 dark:text-blue-400 text-2xl"
              />
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">连续签到</p>
                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {{ checkinStats.currentStreak }} 天
                </p>
              </div>
            </div>
          </div>

          <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <div class="flex items-center space-x-3">
              <font-awesome-icon
                :icon="['fas', 'calendar-check']"
                class="text-green-600 dark:text-green-400 text-2xl"
              />
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">累计签到</p>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">
                  {{ checkinStats.totalCheckins }} 天
                </p>
              </div>
            </div>
          </div>

          <div class="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <div class="flex items-center space-x-3">
              <font-awesome-icon
                :icon="['fas', 'trophy']"
                class="text-purple-600 dark:text-purple-400 text-2xl"
              />
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-400">最长连续</p>
                <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {{ checkinStats.longestStreak }} 天
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 签到日历 -->
      <div class="card-base flex-1 p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">签到日历</h3>

          <!-- 月份切换 -->
          <div class="flex items-center space-x-4">
            <el-button @click="prevMonth" size="small" :icon="ArrowLeft" circle />
            <span class="text-lg font-medium text-gray-900 dark:text-gray-100 min-w-24 text-center">
              {{ currentMonthText }}
            </span>
            <el-button @click="nextMonth" size="small" :icon="ArrowRight" circle />
          </div>
        </div>

        <div class="max-w-md mx-auto">
          <!-- 星期标题 -->
          <div class="grid grid-cols-7 gap-2 mb-2">
            <div
              v-for="weekday in getWeekdays()"
              :key="weekday"
              class="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2"
            >
              {{ weekday }}
            </div>
          </div>

          <!-- 日历格子 -->
          <div class="grid grid-cols-7 gap-2">
            <div
              v-for="day in calendarData"
              :key="day.date"
              :class="[
                'aspect-square flex flex-col items-center justify-center text-sm rounded-lg relative',
                day.isCurrentMonth
                  ? day.checked
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
              ]"
            >
              <span class="font-medium">{{ new Date(day.date).getDate() }}</span>
              <span v-if="day.isToday" class="text-xs text-blue-600 dark:text-blue-400 font-bold"
                >今日</span
              >
            </div>
          </div>

          <!-- 图例 -->
          <div class="flex items-center justify-center gap-6 mt-4 text-xs">
            <div class="flex items-center space-x-1">
              <div
                class="w-3 h-3 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-700"
              ></div>
              <span class="text-gray-600 dark:text-gray-400">已签到</span>
            </div>
            <div class="flex items-center space-x-1">
              <div
                class="w-3 h-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded"
              ></div>
              <span class="text-gray-600 dark:text-gray-400">未签到</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 签到历史 -->
    <div class="card-base p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">签到历史</h3>

      <div class="space-y-3">
        <div
          v-for="record in checkinHistory.slice(0, 10)"
          :key="record.id"
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <div
              class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
            >
              <font-awesome-icon
                :icon="['fas', 'check']"
                class="text-green-600 dark:text-green-400 text-sm"
              />
            </div>
            <div>
              <p class="font-medium text-gray-900 dark:text-gray-100">
                {{ formatDate(record.checkin_date) }} 签到
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                获得配额 {{ record.quota_reward }}
              </p>
            </div>
          </div>

          <div class="text-right">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ formatDate(record.checkin_date) }}
            </p>
            <el-tag type="success" size="small">+{{ record.quota_reward }}</el-tag>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>
