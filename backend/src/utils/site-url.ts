import type { Env } from '@/types'

export const getSiteOrigin = (env: Pick<Env, 'FRONTEND_DOMAIN' | 'ENVIRONMENT'>, requestUrl?: string): string => {
  const domain = env.FRONTEND_DOMAIN?.trim()
  if (!domain) return new URL(requestUrl || 'http://localhost:8787').origin
  const url = /^https?:\/\//.test(domain)
    ? domain
    : `${env.ENVIRONMENT === 'production' ? 'https' : 'http'}://${domain}`
  return new URL(url).origin
}

export const getGitHubCallbackUrl = (env: Pick<Env, 'FRONTEND_DOMAIN' | 'ENVIRONMENT'>, requestUrl?: string): string =>
  new URL('/api/auth/github/callback', getSiteOrigin(env, requestUrl)).toString()
