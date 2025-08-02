import { defineConfig, presetUno, presetAttributify } from 'unocss'
import transformerDirectives from '@unocss/transformer-directives'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify()
  ],

  transformers: [
    transformerDirectives()
  ],

  // 暗色模式配置
  darkMode: 'class', // 使用 class 策略

  theme: {
    colors: {
      // 自定义颜色变量，支持明暗模式
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a'
      },
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827'
      }
    }
  },

  shortcuts: {
    // 常用的明暗模式样式快捷方式
    'bg-base': 'bg-white dark:bg-gray-900',
    'text-base': 'text-gray-900 dark:text-gray-100',
    'border-base': 'border-gray-200 dark:border-gray-700',
    'card-base': 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md',
    'btn-primary': 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors',
    'btn-secondary': 'px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors',
    'input-base': 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
    'container-base': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
  },

  rules: [
    // 自定义规则
    ['text-shadow', { 'text-shadow': '0 2px 4px rgba(0,0,0,0.1)' }],
  ]
})
