import { defineStore } from 'pinia'
import { useDark, useToggle } from '@vueuse/core'
import type { ThemeMode } from '@/types'

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
      // 使用 VueUse 的 useDark 来管理暗色模式
      const isDark = useDark({
        selector: 'html',
        attribute: 'class',
        valueDark: 'dark',
        valueLight: ''
      })

      this.isDark = isDark.value

      // 根据保存的主题设置应用主题
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
      const html = document.documentElement

      if (theme === 'auto') {
        // 跟随系统主题
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        this.isDark = mediaQuery.matches
        
        // 监听系统主题变化
        mediaQuery.addEventListener('change', (e) => {
          if (this.theme === 'auto') {
            this.isDark = e.matches
            this.updateDOMTheme()
          }
        })
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
    paths: ['theme']
  }
})
