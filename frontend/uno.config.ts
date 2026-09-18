import { defineConfig, presetUno, presetAttributify } from 'unocss'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [presetUno(), presetAttributify()],

  transformers: [transformerDirectives()],

  // 暗色模式配置
  darkMode: 'class', // 使用 class 策略

  theme: {
    colors: {
      // 自定义颜色变量，支持明暗模式
      primary: {
        50: '#f3fbf8',
        100: '#e4f2ec',
        200: '#bde5d6',
        300: '#9dd8c2',
        400: '#83c7b0',
        500: '#25856a',
        600: '#23775e',
        700: '#1b604b',
        800: '#164c3e',
        900: '#123b32',
      },
      gray: {
        50: '#f8fbfa',
        100: '#f0f5f2',
        200: '#e0eae4',
        300: '#c8d8cd',
        400: '#94ad9e',
        500: '#657e70',
        600: '#526b63',
        700: '#3c5548',
        800: '#20342a',
        900: '#101b18',
      },
    },
  },

  shortcuts: {
    // 常用的明暗模式样式快捷方式
    'bg-base': 'bg-white dark:bg-gray-900',
    'text-base': 'text-gray-900 dark:text-gray-100',
    'border-base': 'border-gray-200 dark:border-gray-700',
    'card-base':
      'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md',
    'btn-primary':
      'px-4 py-2 bg-[var(--brand-button)] hover:bg-[var(--brand-button-hover)] text-white rounded transition-colors',
    'btn-secondary': 'px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors',
    'input-base':
      'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500',
    'container-base': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  },

  rules: [
    // 自定义规则
    ['text-shadow', { 'text-shadow': '0 2px 4px rgba(0,0,0,0.1)' }],
  ],
})
