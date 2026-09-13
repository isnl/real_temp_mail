import { defineStore } from 'pinia'
import type { ThemeMode } from '@/types'

let systemThemeQuery: MediaQueryList | null = null
let systemThemeListenerAttached = false

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: 'auto' as ThemeMode,
    isDark: false
  }),

  getters: {
    currentTheme: (state) => state.theme,
    isDarkMode: (state) => state.isDark
  },

  actions: {
    initTheme() {
      this.applyTheme(this.theme)
    },

    toggleTheme() {
      if (this.theme === 'light') {
        this.setTheme('dark')
      } else if (this.theme === 'dark') {
        this.setTheme('auto')
      } else {
        this.setTheme('light')
      }
    },

    setTheme(theme: ThemeMode) {
      this.theme = theme
      this.applyTheme(theme)
    },

    applyTheme(theme: ThemeMode) {
      if (theme === 'auto') {
        systemThemeQuery ??= window.matchMedia('(prefers-color-scheme: dark)')
        this.isDark = systemThemeQuery.matches

        if (!systemThemeListenerAttached) {
          systemThemeQuery.addEventListener('change', (event) => {
          if (this.theme === 'auto') {
            this.isDark = event.matches
            this.updateDOMTheme()
          }
          })
          systemThemeListenerAttached = true
        }
      } else {
        this.isDark = theme === 'dark'
      }

      this.updateDOMTheme()
    },

    updateDOMTheme() {
      const html = document.documentElement
      
      if (this.isDark) {
        html.classList.add('dark')
        html.setAttribute('data-theme', 'dark')
      } else {
        html.classList.remove('dark')
        html.setAttribute('data-theme', 'light')
      }

      // 更新 Element Plus 主题
      this.updateElementPlusTheme()
    },

    updateElementPlusTheme() {
      // Element Plus 主题切换
      const body = document.body
      if (this.isDark) {
        body.classList.add('dark')
      } else {
        body.classList.remove('dark')
      }
    },

    // 获取主题图标
    getThemeIcon() {
      switch (this.theme) {
        case 'light':
          return 'sun'
        case 'dark':
          return 'moon'
        case 'auto':
          return 'circle-half-stroke'
        default:
          return 'circle-half-stroke'
      }
    },

    // 获取主题显示名称
    getThemeDisplayName() {
      switch (this.theme) {
        case 'light':
          return '浅色模式'
        case 'dark':
          return '深色模式'
        case 'auto':
          return '跟随系统'
        default:
          return '跟随系统'
      }
    }
  },

  persist: {
    key: 'theme-store',
    storage: localStorage,
    pick: ['theme']
  }
})
