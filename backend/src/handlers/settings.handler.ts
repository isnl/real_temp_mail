import type { ApiResponse, Env } from '@/types'
import { SystemSettingsService } from '@/modules/settings/settings.service'

export class SettingsHandler {
  constructor(private env: Env) {}

  async getPublicSettings(): Promise<Response> {
    try {
      const settings = await new SystemSettingsService(this.env).getPublicSettings()
      const response: ApiResponse<typeof settings> = { success: true, data: settings }
      return Response.json(response, {
        headers: { 'Cache-Control': 'private, no-store' }
      })
    } catch (error) {
      console.error('Get public settings error:', error)
      return Response.json({ success: false, error: '获取公开设置失败' }, { status: 500 })
    }
  }
}
