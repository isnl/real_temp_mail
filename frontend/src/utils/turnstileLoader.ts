export interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
  getResponse: (widgetId: string) => string
}

type TurnstileWindow = Window & { turnstile?: TurnstileApi }

let scriptPromise: Promise<void> | null = null

export const getTurnstile = (): TurnstileApi | undefined =>
  typeof window === 'undefined' ? undefined : (window as TurnstileWindow).turnstile

const waitForTurnstileApi = (script: HTMLScriptElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearInterval(pollId)
      window.clearTimeout(timeoutId)
      script.removeEventListener('error', handleError)
    }

    const succeedWhenReady = () => {
      if (typeof getTurnstile()?.render !== 'function') return
      cleanup()
      resolve()
    }

    const handleError = () => {
      cleanup()
      reject(new Error('Cloudflare Turnstile 脚本加载失败'))
    }

    script.addEventListener('error', handleError, { once: true })
    const pollId = window.setInterval(succeedWhenReady, 50)
    const timeoutId = window.setTimeout(() => {
      cleanup()
      reject(new Error('Cloudflare Turnstile 脚本加载超时'))
    }, 12_000)
    succeedWhenReady()
  })

/** 同一页面的所有验证组件共用一次脚本加载，避免重复插入和事件竞态。 */
export const loadTurnstileScript = (): Promise<void> => {
  if (typeof document === 'undefined') return Promise.resolve()
  if (getTurnstile()) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = (async () => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-loader], script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]',
    )

    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstileLoader = 'true'
      document.head.appendChild(script)
    }

    await waitForTurnstileApi(script)
  })().catch((error) => {
    scriptPromise = null
    throw error
  })

  return scriptPromise
}
