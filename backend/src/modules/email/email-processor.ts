import PostalMime from 'postal-mime'
import type { Env } from '@/types'
import { extractVerificationCodeFromEmailContent } from '@/modules/email/verification-code'
import { DatabaseService } from '@/modules/shared/database.service'

const MAX_RAW_EMAIL_BYTES = 10 * 1024 * 1024
const MAX_SENDER_BYTES = 320
const MAX_SUBJECT_BYTES = 512
const MAX_TEXT_BYTES = 64 * 1024
const MAX_HTML_BYTES = 128 * 1024
const MAX_VERIFICATION_CODE_BYTES = 64
const MAX_EMAILS_PER_INBOX = 50
const MAX_STORED_BYTES_PER_INBOX = 4 * 1024 * 1024
const MAX_DEDUP_TOMBSTONES_PER_INBOX = 4096
const MAX_DEDUP_TOMBSTONES_GLOBAL = 100_000
const INBOX_RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_EMAILS_PER_INBOX_WINDOW = 20

interface InboxOwner {
  id: number
}

export async function handleEmailProcessing(
  message: ForwardableEmailMessage,
  env: Env
): Promise<void> {
  const recipient = normalizeEnvelopeAddress(message.to)
  if (!recipient) {
    message.setReject('Invalid recipient address')
    return
  }

  if (!Number.isSafeInteger(message.rawSize) || message.rawSize < 0 || message.rawSize > MAX_RAW_EMAIL_BYTES) {
    console.warn('Inbound email rejected: message exceeds the configured size limit')
    message.setReject('Message is too large')
    return
  }

  // The SMTP envelope recipient is authoritative. MIME To headers are
  // attacker-controlled and must never select another user's inbox.
  const inbox = await env.DB.prepare(`
    SELECT te.id
    FROM temp_emails te
    JOIN users u ON u.id = te.user_id
    JOIN domains d ON d.id = te.domain_id
    WHERE te.email = ? COLLATE NOCASE
      AND te.active = 1
      AND u.is_active = 1
      AND d.status = 1
      AND d.deleted_at IS NULL
    LIMIT 1
  `).bind(recipient).first<InboxOwner>()

  if (!inbox) {
    console.info('Inbound email rejected: mailbox is unavailable')
    message.setReject('Mailbox unavailable')
    return
  }

  const inboxRequestCount = await new DatabaseService(env.DB).createOrUpdateRateLimit(
    `inbox:${inbox.id}`,
    'email-routing',
    INBOX_RATE_LIMIT_WINDOW_MS
  )
  if (inboxRequestCount > MAX_EMAILS_PER_INBOX_WINDOW) {
    console.warn('Inbound email rejected: mailbox rate limit exceeded', { tempEmailId: inbox.id })
    message.setReject('Mailbox rate limit exceeded')
    return
  }

  const rawEmail = await new Response(message.raw).arrayBuffer()
  if (rawEmail.byteLength > MAX_RAW_EMAIL_BYTES) {
    console.warn('Inbound email rejected: actual message size exceeds the configured limit')
    message.setReject('Message is too large')
    return
  }
  const dedupKey = await sha256Hex(rawEmail)
  const duplicate = await env.DB.prepare(`
    SELECT 1 AS duplicate
    FROM email_delivery_dedup
    WHERE temp_email_id = ? AND dedup_key = ?
    LIMIT 1
  `).bind(inbox.id, dedupKey).first<{ duplicate: number }>()
  if (duplicate) {
    console.info('Inbound email deduplicated', { tempEmailId: inbox.id })
    return
  }

  let parsedEmail: Awaited<ReturnType<PostalMime['parse']>>
  try {
    parsedEmail = await new PostalMime().parse(rawEmail)
  } catch {
    console.warn('Inbound email rejected: MIME parsing failed')
    message.setReject('Malformed email')
    return
  }

  const sender = sanitizeHeader(parsedEmail.from?.address || message.from, MAX_SENDER_BYTES)
    || 'unknown@invalid'
  const subject = sanitizeHeader(parsedEmail.subject || '无主题', MAX_SUBJECT_BYTES) || '无主题'
  const textContent = truncateUtf8(parsedEmail.text, MAX_TEXT_BYTES)
  const htmlContent = truncateUtf8(parsedEmail.html, MAX_HTML_BYTES)
  const verificationCode = truncateUtf8(
    extractVerificationCodeFromEmailContent(textContent, htmlContent),
    MAX_VERIFICATION_CODE_BYTES
  ) || null
  const operationId = crypto.randomUUID()

  // A unique raw-message digest makes platform retries idempotent. Database
  // errors are intentionally not caught: transient D1 failures must surface so
  // Email Routing can retry instead of silently losing mail.
  const results = await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO email_delivery_dedup (temp_email_id, dedup_key, operation_id, received_at)
      SELECT te.id, ?, ?, CURRENT_TIMESTAMP
      FROM temp_emails te
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE te.id = ?
        AND te.active = 1
        AND u.is_active = 1
        AND d.status = 1
        AND d.deleted_at IS NULL
      ON CONFLICT(temp_email_id, dedup_key) DO NOTHING
      RETURNING operation_id
    `).bind(dedupKey, operationId, inbox.id),
    env.DB.prepare(`
      INSERT INTO emails (
        temp_email_id,
        sender,
        subject,
        content,
        html_content,
        verification_code,
        dedup_key,
        received_at
      )
      SELECT te.id, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      FROM email_delivery_dedup delivery
      JOIN temp_emails te ON te.id = delivery.temp_email_id
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE delivery.operation_id = ?
        AND te.active = 1
        AND u.is_active = 1
        AND d.status = 1
        AND d.deleted_at IS NULL
      ON CONFLICT(temp_email_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
      RETURNING id
    `).bind(
      sender,
      subject,
      textContent || null,
      htmlContent || null,
      verificationCode,
      dedupKey,
      operationId
    ),
    env.DB.prepare(`
      WITH ranked AS (
        SELECT id,
          ROW_NUMBER() OVER (ORDER BY id DESC) AS position,
          SUM(
            COALESCE(length(CAST(sender AS BLOB)), 0) +
            COALESCE(length(CAST(subject AS BLOB)), 0) +
            COALESCE(length(CAST(content AS BLOB)), 0) +
            COALESCE(length(CAST(html_content AS BLOB)), 0) +
            COALESCE(length(CAST(verification_code AS BLOB)), 0)
          ) OVER (ORDER BY id DESC ROWS UNBOUNDED PRECEDING) AS cumulative_bytes
        FROM emails
        WHERE temp_email_id = ?
      )
      DELETE FROM emails
      WHERE id IN (
        SELECT id FROM ranked
        WHERE position > ? OR cumulative_bytes > ?
      )
    `).bind(inbox.id, MAX_EMAILS_PER_INBOX, MAX_STORED_BYTES_PER_INBOX),
    env.DB.prepare(`
      DELETE FROM email_delivery_dedup
      WHERE rowid IN (
        SELECT rowid
        FROM email_delivery_dedup
        WHERE temp_email_id = ?
        ORDER BY rowid DESC
        LIMIT -1 OFFSET ?
      )
    `).bind(inbox.id, MAX_DEDUP_TOMBSTONES_PER_INBOX),
    env.DB.prepare(`
      DELETE FROM email_delivery_dedup
      WHERE rowid <= (
        SELECT COALESCE(MAX(rowid), 0) - ?
        FROM email_delivery_dedup
      )
    `).bind(MAX_DEDUP_TOMBSTONES_GLOBAL),
    env.DB.prepare(`
      SELECT 1 AS available
      FROM temp_emails te
      JOIN users u ON u.id = te.user_id
      JOIN domains d ON d.id = te.domain_id
      WHERE te.id = ?
        AND te.active = 1
        AND u.is_active = 1
        AND d.status = 1
        AND d.deleted_at IS NULL
      LIMIT 1
    `).bind(inbox.id)
  ])
  const stored = (results[1]?.results as Array<{ id: number }> | undefined)?.[0]

  if (!stored) {
    const available = (results[5]?.results as Array<{ available: number }> | undefined)?.[0]
    if (!available) {
      console.info('Inbound email rejected: mailbox became unavailable')
      message.setReject('Mailbox unavailable')
      return
    }
    console.info('Inbound email deduplicated', { tempEmailId: inbox.id })
    return
  }

  console.info('Inbound email stored', {
    emailId: stored.id,
    tempEmailId: inbox.id,
    hasText: Boolean(textContent),
    hasHtml: Boolean(htmlContent),
    hasVerificationCode: Boolean(verificationCode)
  })
}

function normalizeEnvelopeAddress(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (
    !normalized ||
    normalized.length > 254 ||
    /[\r\n\0]/.test(normalized) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null
  }
  return normalized
}

function sanitizeHeader(value: string | undefined, maximumBytes: number): string {
  const sanitized = (value || '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return truncateUtf8(sanitized, maximumBytes)
}

function truncateUtf8(value: string | undefined, maximumBytes: number): string {
  const normalized = (value || '').replace(/\0/g, '')
  const encoded = new TextEncoder().encode(normalized)
  if (encoded.byteLength <= maximumBytes) return normalized

  const decoder = new TextDecoder('utf-8', { fatal: true })
  let end = maximumBytes
  while (end > 0) {
    try {
      return decoder.decode(encoded.subarray(0, end))
    } catch {
      end--
    }
  }
  return ''
}

async function sha256Hex(value: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', value)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
