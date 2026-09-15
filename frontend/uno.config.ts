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
        50: '#fff7f0',
        100: '#ffecd9',
        200: '#fbd3b1',
        300: '#f4b382',
        400: '#e9955b',
        500: '#c65d27',
        600: '#bd5722',
        700: '#9e451c',
        800: '#783819',
        900: '#4e2b1c',
      },
      gray: {
        50: '#faf9f7',
        100: '#f3f1ee',
        200: '#e6e1db',
        300: '#d5cdc4',
        400: '#a79b90',
        500: '#807368',
        600: '#63594f',
        700: '#51473e',
        800: '#302923',
        900: '#201c18',
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
      'px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors',
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
