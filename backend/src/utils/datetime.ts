const SQLITE_UTC_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/
const SQLITE_BOOLEAN_KEYS = new Set([
  'active',
  'is_active',
  'is_read',
  'is_secret',
  'is_configured',
  'never_expires',
  'public_inbox_enabled',
  'used'
])

/**
 * D1 CURRENT_TIMESTAMP values do not carry a timezone suffix. The database
 * contract is UTC, so make that explicit at the API boundary instead of
 * letting browsers interpret the value in their local timezone.
 */
export function normalizeApiTimestamps<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => normalizeApiTimestamps(item)) as T
  }
  if (!value || typeof value !== 'object') return value
  if (value instanceof Date) return value.toISOString() as T

  const normalized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && isTimestampKey(key)) {
      normalized[key] = normalizeSqliteUtcTimestamp(item)
    } else if (typeof item === 'number' && (item === 0 || item === 1) && SQLITE_BOOLEAN_KEYS.has(key)) {
      normalized[key] = item === 1
    } else {
      normalized[key] = normalizeApiTimestamps(item)
    }
  }
  return normalized as T
}

export function normalizeSqliteUtcTimestamp(value: string): string {
  const match = SQLITE_UTC_TIMESTAMP.exec(value)
  if (!match) return value
  return `${match[1]}T${match[2]}${match[3] ?? ''}Z`
}

function isTimestampKey(key: string): boolean {
  return key === 'timestamp' ||
    key === 'valid_until' ||
    key === 'validUntil' ||
    key.endsWith('_at') ||
    key.endsWith('At')
}
