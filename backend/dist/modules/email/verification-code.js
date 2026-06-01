const CODE_KEYWORDS = /临时验证码|验证码|动态码|安全码|校验码|验证代码|一次性代码|登录码|确认码|verification code|security code|access code|one[-\s]?time code|one[-\s]?time passcode|passcode|otp|pin|code/gi;
const CSS_HEX_COLOR_PATTERN = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CSS_DECLARATION_PATTERN = /\b(?:background(?:-color)?|border(?:-radius|-color|-width)?|box-shadow|color|font(?:-family|-size|-weight)?|height|line-height|margin(?:-(?:top|right|bottom|left))?|padding(?:-(?:top|right|bottom|left))?|text-align|width)\s*:\s*[^;{}<>]+;?/gi;
export function extractVerificationCodeFromEmailContent(text = '', html = '') {
    const content = normalizeContentForCodeExtraction(text, html);
    return extractVerificationCode(content);
}
export function normalizeContentForCodeExtraction(text = '', html = '') {
    return [toVisibleText(text), toVisibleText(html)]
        .filter(Boolean)
        .join(' ')
        .replace(CSS_HEX_COLOR_PATTERN, ' ')
        .replace(CSS_DECLARATION_PATTERN, ' ')
        .replace(URL_PATTERN, ' ')
        .replace(EMAIL_PATTERN, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
export function extractVerificationCode(content) {
    if (!content)
        return undefined;
    const candidates = collectCodeCandidates(content);
    if (candidates.length === 0)
        return undefined;
    const keywordMatches = Array.from(content.matchAll(CODE_KEYWORDS));
    if (keywordMatches.length > 0) {
        for (const keywordMatch of keywordMatches) {
            const keywordIndex = keywordMatch.index ?? 0;
            const afterKeyword = candidates.find(candidate => {
                const distance = candidate.index - keywordIndex;
                return distance >= 0 && distance <= 180;
            });
            if (afterKeyword) {
                return afterKeyword.value;
            }
        }
        const nearest = candidates
            .map(candidate => {
            const distance = Math.min(...keywordMatches.map(keywordMatch => Math.abs(candidate.index - (keywordMatch.index ?? 0))));
            return { ...candidate, distance };
        })
            .sort((a, b) => a.distance - b.distance)[0];
        return nearest?.value;
    }
    return candidates[0]?.value;
}
function toVisibleText(content) {
    if (!content)
        return '';
    return decodeHtmlEntities(content
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(?:br|\/p|\/div|\/tr|\/td|\/th|\/li)\b[^>]*>/gi, ' ')
        .replace(/<[^>]+>/g, ' '))
        .replace(CSS_HEX_COLOR_PATTERN, ' ')
        .replace(CSS_DECLARATION_PATTERN, ' ')
        .replace(URL_PATTERN, ' ')
        .replace(EMAIL_PATTERN, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function decodeHtmlEntities(content) {
    return content
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => decodeEntityCodePoint(Number.parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => decodeEntityCodePoint(Number.parseInt(code, 10)));
}
function decodeEntityCodePoint(codePoint) {
    if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return ' ';
    }
    return String.fromCodePoint(codePoint);
}
function collectCodeCandidates(content) {
    const candidates = [];
    const seen = new Set();
    const patterns = [
        /\b\d{3}[-\s]\d{3}\b/g,
        /\b\d{2}[-\s]\d{2}[-\s]\d{2}\b/g,
        /\b\d{4,8}\b/g
    ];
    for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
            const rawValue = match[0];
            const index = match.index ?? 0;
            const value = rawValue.replace(/[-\s]/g, '');
            if (!isValidCodeCandidate(content, rawValue, value, index)) {
                continue;
            }
            const key = `${value}:${index}`;
            if (!seen.has(key)) {
                seen.add(key);
                candidates.push({ value, index });
            }
        }
    }
    return candidates.sort((a, b) => a.index - b.index);
}
function isValidCodeCandidate(content, rawValue, value, index) {
    if (value.length < 4 || value.length > 8)
        return false;
    const previousChar = content[index - 1] || '';
    const nextChar = content[index + rawValue.length] || '';
    if (previousChar === '#')
        return false;
    if (/[A-Za-z0-9]/.test(previousChar) || /[A-Za-z0-9]/.test(nextChar))
        return false;
    if (/^(?:19|20)\d{2}$/.test(value))
        return false;
    if (/^(?:19|20)\d{6}$/.test(value))
        return false;
    return true;
}
