import type {
  Env,
  Announcement,
  AnnouncementType,
  CreateAnnouncementData,
  UpdateAnnouncementData,
  AdminAnnouncementListParams,
  PaginatedResponse
} from '@/types'

import {
  ValidationError,
  NotFoundError
} from '@/types'

const ANNOUNCEMENT_TYPES: readonly AnnouncementType[] = ['info', 'warning', 'success', 'error']
const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 10_000
const MIN_PRIORITY = 0
const MAX_PRIORITY = 100
const MAX_PAGE_SIZE = 100
const ANNOUNCEMENT_COLUMNS = `
  id, title, content, type, is_active, priority, created_by, created_at, updated_at
`

function normalizePage(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1
  return Math.max(1, Math.trunc(value))
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 20
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(value)))
}

function normalizeText(value: unknown, fieldName: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName}必须是字符串`)
  }

  const normalized = value.trim()
  if (!normalized) {
    throw new ValidationError(`${fieldName}不能为空`)
  }
  if (normalized.length > maxLength) {
    throw new ValidationError(`${fieldName}不能超过${maxLength}个字符`)
  }

  return normalized
}

function validateType(value: unknown): AnnouncementType {
  if (typeof value !== 'string' || !ANNOUNCEMENT_TYPES.includes(value as AnnouncementType)) {
    throw new ValidationError('公告类型无效')
  }
  return value as AnnouncementType
}

function validatePriority(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_PRIORITY ||
    value > MAX_PRIORITY
  ) {
    throw new ValidationError(`公告优先级必须是${MIN_PRIORITY}到${MAX_PRIORITY}之间的整数`)
  }
  return value
}

function validateActiveStatus(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError('公告状态必须是布尔值')
  }
  return value
}

export class AnnouncementService {
  private env: Env

  constructor(env: Env) {
    this.env = env
  }

  /**
   * 获取公告列表（分页）
   */
  async getAnnouncements(params: AdminAnnouncementListParams): Promise<PaginatedResponse<Announcement>> {
    const {
      search,
      status
    } = params

    const page = normalizePage(params.page)
    const limit = normalizeLimit(params.limit)

    const offset = (page - 1) * limit

    // 构建查询条件
    let whereClause = '1=1'
    const queryParams: string[] = []

    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ?)'
      queryParams.push(`%${search}%`, `%${search}%`)
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1'
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0'
    }

    const countQuery = `SELECT COUNT(*) as total FROM announcements WHERE ${whereClause}`
    const dataQuery = `
      SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    const [countResult, announcementResult] = await this.env.DB.batch([
      this.env.DB.prepare(countQuery).bind(...queryParams),
      this.env.DB.prepare(dataQuery).bind(...queryParams, limit, offset)
    ])

    if (!countResult || !announcementResult) {
      throw new Error('获取公告列表失败')
    }

    const countRow = countResult.results[0] as { total?: unknown } | undefined
    const parsedTotal = Number(countRow?.total)
    const total = Number.isFinite(parsedTotal) ? Math.max(0, parsedTotal) : 0

    return {
      data: announcementResult.results as unknown as Announcement[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * 获取活跃公告列表（用户端）
   */
  async getActiveAnnouncements(): Promise<Announcement[]> {
    const query = `
      SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements
      WHERE is_active = 1
      ORDER BY priority DESC, created_at DESC
    `
    const result = await this.env.DB.prepare(query).all()
    // 兼容不同环境下的返回结果格式
    const announcementData = result.results || result
    return announcementData as unknown as Announcement[]
  }

  /**
   * 根据ID获取公告
   */
  async getAnnouncementById(id: number): Promise<Announcement | null> {
    const query = `SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`
    const result = await this.env.DB.prepare(query).bind(id).first()
    return result as Announcement | null
  }

  /**
   * 创建公告
   */
  async createAnnouncement(data: CreateAnnouncementData, createdBy: number): Promise<Announcement> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ValidationError('公告数据格式无效')
    }
    if (!Number.isSafeInteger(createdBy) || createdBy <= 0) {
      throw new ValidationError('公告创建人无效')
    }

    const title = normalizeText(data.title, '公告标题', MAX_TITLE_LENGTH)
    const content = normalizeText(data.content, '公告内容', MAX_CONTENT_LENGTH)
    const type = data.type === undefined ? 'info' : validateType(data.type)
    const priority = data.priority === undefined ? 0 : validatePriority(data.priority)
    const isActive = data.is_active === undefined ? true : validateActiveStatus(data.is_active)

    const query = `
      INSERT INTO announcements (
        title, content, type, is_active, priority, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `

    const result = await this.env.DB.prepare(query)
      .bind(title, content, type, isActive ? 1 : 0, priority, createdBy)
      .run()

    if (!result.success) {
      throw new Error('创建公告失败')
    }

    const newAnnouncement = await this.getAnnouncementById(result.meta.last_row_id as number)
    if (!newAnnouncement) {
      throw new Error('获取新创建的公告失败')
    }

    return newAnnouncement
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(id: number, data: UpdateAnnouncementData): Promise<void> {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new ValidationError('公告数据格式无效')
    }

    const { title, content, type, is_active, priority } = data

    // 检查公告是否存在
    const existingAnnouncement = await this.getAnnouncementById(id)
    if (!existingAnnouncement) {
      throw new NotFoundError('公告不存在')
    }

    // 验证输入
    if (title !== undefined) {
      normalizeText(title, '公告标题', MAX_TITLE_LENGTH)
    }

    if (content !== undefined) {
      normalizeText(content, '公告内容', MAX_CONTENT_LENGTH)
    }

    if (type !== undefined) {
      validateType(type)
    }

    if (priority !== undefined) {
      validatePriority(priority)
    }

    if (is_active !== undefined) {
      validateActiveStatus(is_active)
    }

    // 构建更新语句
    const updateFields: string[] = []
    const updateParams: any[] = []

    if (title !== undefined) {
      updateFields.push('title = ?')
      updateParams.push(normalizeText(title, '公告标题', MAX_TITLE_LENGTH))
    }

    if (content !== undefined) {
      updateFields.push('content = ?')
      updateParams.push(normalizeText(content, '公告内容', MAX_CONTENT_LENGTH))
    }

    if (type !== undefined) {
      updateFields.push('type = ?')
      updateParams.push(validateType(type))
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?')
      updateParams.push(validateActiveStatus(is_active) ? 1 : 0)
    }

    if (priority !== undefined) {
      updateFields.push('priority = ?')
      updateParams.push(validatePriority(priority))
    }

    if (updateFields.length === 0) {
      throw new ValidationError('没有提供要更新的字段')
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP')
    updateParams.push(id)

    const query = `
      UPDATE announcements 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `

    const result = await this.env.DB.prepare(query).bind(...updateParams).run()

    if (!result.success) {
      throw new Error('更新公告失败')
    }
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(id: number): Promise<void> {
    // 检查公告是否存在
    const existingAnnouncement = await this.getAnnouncementById(id)
    if (!existingAnnouncement) {
      throw new NotFoundError('公告不存在')
    }

    const query = 'DELETE FROM announcements WHERE id = ?'
    const result = await this.env.DB.prepare(query).bind(id).run()

    if (!result.success) {
      throw new Error('删除公告失败')
    }
  }

  /**
   * 切换公告状态
   */
  async toggleAnnouncementStatus(id: number): Promise<void> {
    const query = `
      UPDATE announcements
      SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    const result = await this.env.DB.prepare(query).bind(id).run()

    if (!result.success) {
      throw new Error('切换公告状态失败')
    }

    if (result.meta.changes === 0) {
      throw new NotFoundError('公告不存在')
    }
  }
}
