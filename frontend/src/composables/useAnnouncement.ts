import { h, ref } from 'vue'
import { ElButton, ElNotification } from 'element-plus'
import { getLatestAnnouncement } from '@/api/announcement'
import type { Announcement } from '@/api/announcement'

// 本地存储键名
const ANNOUNCEMENT_STORAGE_KEY = 'announcement_dismissed'

/**
 * 公告管理组合式函数
 */
export function useAnnouncement() {
  const loading = ref(false)
  const currentAnnouncement = ref<Announcement | null>(null)

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  const getTodayString = (): string => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * 检查公告是否已被今日关闭
   */
  const isAnnouncementDismissedToday = (announcementId: number): boolean => {
    const dismissedData = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)
    if (!dismissedData) return false

    try {
      const dismissed: Record<number, string> = JSON.parse(dismissedData)
      const today = getTodayString()
      return dismissed[announcementId] === today
    } catch {
      return false
    }
  }

  /**
   * 标记公告为今日已关闭
   */
  const dismissAnnouncementForToday = (announcementId: number): void => {
    const dismissedData = localStorage.getItem(ANNOUNCEMENT_STORAGE_KEY)
    let dismissed: Record<number, string> = {}

    try {
      dismissed = dismissedData ? JSON.parse(dismissedData) : {}
    } catch {
      dismissed = {}
    }

    const today = getTodayString()
    const recentEntries = Object.entries(dismissed).filter(([, date]) => date === today)
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify({
      ...Object.fromEntries(recentEntries),
      [announcementId]: today,
    }))
  }

  /**
  * 显示公告通知
  */
  const showAnnouncementNotification = (announcement: Announcement): void => {
    let closeNotification: () => void = () => {}
    const message = h('div', { class: 'announcement-content' }, [
      h('p', { class: 'announcement-message' }, announcement.content),
      h('div', { class: 'announcement-actions' }, [
        h(ElButton, {
          size: 'small',
          onClick: () => closeNotification(),
        }, () => '本次关闭'),
        h(ElButton, {
          size: 'small',
          type: 'primary',
          onClick: () => {
            dismissAnnouncementForToday(announcement.id)
            closeNotification()
          },
        }, () => '今日不再提示'),
      ]),
    ])

    const notification = ElNotification({
      title: announcement.title,
      message,
      position: 'bottom-right',
      duration: 0,
      showClose: true,
    })
    closeNotification = () => notification.close()
  }

  /**
   * 检查并显示公告
   */
  const checkAndShowAnnouncement = async (): Promise<void> => {
    try {
      loading.value = true
      const response = await getLatestAnnouncement()

      if (response.success && response.data) {
        const announcement = response.data
        currentAnnouncement.value = announcement

        // 检查是否已被今日关闭
        if (!isAnnouncementDismissedToday(announcement.id)) {
          showAnnouncementNotification(announcement)
        }
      }
    } catch (error) {
      console.error('获取公告失败:', error)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    currentAnnouncement,
    checkAndShowAnnouncement,
    dismissAnnouncementForToday,
    isAnnouncementDismissedToday
  }
}
