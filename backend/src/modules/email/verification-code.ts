const CODE_KEYWORDS =
  /临时验证码|验证码|动态码|安全码|校验码|验证代码|一次性代码|登录码|确认码|verification code|security code|access code|one[-\s]?time code|one[-\s]?time passcode|passcode|otp|pin|code/gi

const CSS_HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const CSS_DECLARATION_PATTERN =
  /\b(?:background(?:-color)?|border(?:-radius|-color|-width)?|box-shadow|color|font(?:-family|-size|-weight)?|height|line-height|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|text-align|width)\s*:\s*[^;{}<>]+;?/gi
const MAX_EXTRACTION_CHARACTERS = 64 * 1024
const MAX_MATCHES = 256

interface CodeCandidate {
  value: string
  index: number
}

export function extractVerificationCodeFromEmailContent(
  text: string = '',
  html: string = ''
): string | undefined {
  // OTPs are normally near the beginning of transactional messages. Keeping
  // extraction input small bounds regex/HTML work for attacker-controlled mail.
  const textBudget = Math.floor(MAX_EXTRACTION_CHARACTERS / 2)
  const content = normalizeContentForCodeExtraction(
    text.slice(0, textBudget),
    html.slice(0, MAX_EXTRACTION_CHARACTERS - textBudget)
  )
  return extractVerificationCode(content)
}

export function normalizeContentForCodeExtraction(text: string = '', html: string = ''): string {
  return [toVisibleText(text), toVisibleText(html)]
    .filter(Boolean)
    .join(' ')
    .replace(CSS_HEX_COLOR_PATTERN, ' ')
    .replace(CSS_DECLARATION_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(EMAIL_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractVerificationCode(content: string): string | undefined {
  if (!content) return undefined

  const candidates = collectCodeCandidates(content)
  if (candidates.length === 0) return undefined

  const keywordMatches: number[] = []
  for (const match of content.matchAll(CODE_KEYWORDS)) {
    keywordMatches.push(match.index ?? 0)
    if (keywordMatches.length >= MAX_MATCHES) break
  }
  if (keywordMatches.length > 0) {
    let candidateCursor = 0
    for (const keywordIndex of keywordMatches) {
      while (candidateCursor < candidates.length && candidates[candidateCursor]!.index < keywordIndex) {
        candidateCursor++
      }
      const afterKeyword = candidates[candidateCursor]
      if (afterKeyword && afterKeyword.index - keywordIndex <= 180) return afterKeyword.value
    }

    let nearest: CodeCandidate | undefined
    let nearestDistance = Number.POSITIVE_INFINITY
    candidateCursor = 0
    for (const keywordIndex of keywordMatches) {
      while (
        candidateCursor + 1 < candidates.length &&
        candidates[candidateCursor + 1]!.index <= keywordIndex
      ) {
        candidateCursor++
      }
      for (const candidate of [candidates[candidateCursor], candidates[candidateCursor + 1]]) {
        if (!candidate) continue
        const distance = Math.abs(candidate.index - keywordIndex)
        if (distance < nearestDistance) {
          nearest = candidate
          nearestDistance = distance
        }
      }
    }
    return nearest?.value
  }

  return candidates[0]?.value
}

function toVisibleText(content: string): string {
  if (!content) return ''

  return decodeHtmlEntities(
    stripMarkup(content)
  )
    .replace(CSS_HEX_COLOR_PATTERN, ' ')
    .replace(CSS_DECLARATION_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(EMAIL_PATTERN, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripMarkup(content: string): string {
  let output = ''
  let index = 0
  const lower = content.toLowerCase()

  while (index < content.length) {
    if (content[index] !== '<') {
      output += content[index]
      index++
      continue
    }

    if (content.startsWith('<!--', index)) {
      const commentEnd = content.indexOf('-->', index + 4)
      index = commentEnd < 0 ? content.length : commentEnd + 3
      output += ' '
      continue
    }

    const tagEnd = findTagEnd(content, index)
    if (tagEnd < 0) break
    const opening = lower.slice(index, Math.min(tagEnd + 1, index + 32))
    const skippedTag = /^<\s*(script|style)(?:\s|>)/.exec(opening)?.[1]
    if (skippedTag) {
      const closingStart = lower.indexOf(`</${skippedTag}`, tagEnd + 1)
      if (closingStart < 0) break
      const closingEnd = findTagEnd(content, closingStart)
      index = closingEnd < 0 ? content.length : closingEnd + 1
      output += ' '
      continue
    }

    index = tagEnd + 1
    output += ' '
  }

  return output
}

function findTagEnd(content: string, start: number): number {
  let quote = ''
  for (let index = start + 1; index < content.length; index++) {
    const character = content[index]!
    if (quote) {
      if (character === quote) quote = ''
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return index
    }
  }
  return -1
}

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      decodeEntityCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      decodeEntityCodePoint(Number.parseInt(code, 10))
    )
}

function decodeEntityCodePoint(codePoint: number): string {
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return ' '
  }

  return String.fromCodePoint(codePoint)
}

function collectCodeCandidates(content: string): CodeCandidate[] {
  const candidates: CodeCandidate[] = []
  const seen = new Set<string>()
  const patterns = [
    /\b\d{3}[-\s]\d{3}\b/g,
    /\b\d{2}[-\s]\d{2}[-\s]\d{2}\b/g,
    /\b\d{4,8}\b/g
  ]

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const rawValue = match[0]
      const index = match.index ?? 0
      const value = rawValue.replace(/[-\s]/g, '')

      if (!isValidCodeCandidate(content, rawValue, value, index)) {
        continue
      }

      const key = `${value}:${index}`
      if (!seen.has(key)) {
        seen.add(key)
        candidates.push({ value, index })
        if (candidates.length >= MAX_MATCHES) return candidates.sort((a, b) => a.index - b.index)
      }
    }
  }

  return candidates.sort((a, b) => a.index - b.index)
}

function isValidCodeCandidate(
  content: string,
  rawValue: string,
  value: string,
  index: number
): boolean {
  if (value.length < 4 || value.length > 8) return false

  const previousChar = content[index - 1] || ''
  const nextChar = content[index + rawValue.length] || ''

  if (previousChar === '#') return false
  if (/[A-Za-z0-9]/.test(previousChar) || /[A-Za-z0-9]/.test(nextChar)) return false
  if (/^(?:19|20)\d{2}$/.test(value)) return false
  if (/^(?:19|20)\d{6}$/.test(value)) return false

  return true
}
