import { ref } from 'vue'
import { ElNotification } from 'element-plus'
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
    return new Date().toISOString().split('T')[0]
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

    dismissed[announcementId] = getTodayString()
    localStorage.setItem(ANNOUNCEMENT_STORAGE_KEY, JSON.stringify(dismissed))
  }

  /**
   * 显示公告通知
   */
  const showAnnouncementNotification = (announcement: Announcement): void => {
    ElNotification({
      title: announcement.title,
      message: `
        <div style="max-height: 200px; overflow-y: auto;">
          ${announcement.content.replace(/\n/g, '<br>')}
        </div>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
          <button id="dismiss-once" style="margin-right: 8px; padding: 4px 12px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">本次关闭</button>
          <button id="dismiss-today" style="padding: 4px 12px; background: #67c23a; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">当日不再弹出</button>
        </div>
      `,
      dangerouslyUseHTMLString: true,
      position: 'bottom-right',
      duration: 0, // 不自动关闭
      showClose: false, // 隐藏默认关闭按钮
      onClose: () => {
        // 默认关闭行为（本次关闭）
      }
    })

    // 添加按钮事件监听
    setTimeout(() => {
      const dismissOnceBtn = document.getElementById('dismiss-once')
      const dismissTodayBtn = document.getElementById('dismiss-today')

      if (dismissOnceBtn) {
        dismissOnceBtn.addEventListener('click', () => {
          // 关闭所有通知
          ElNotification.closeAll()
        })
      }

      if (dismissTodayBtn) {
        dismissTodayBtn.addEventListener('click', () => {
          dismissAnnouncementForToday(announcement.id)
          ElNotification.closeAll()
        })
      }
    }, 100)
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
