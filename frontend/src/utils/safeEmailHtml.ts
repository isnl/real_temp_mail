const EMAIL_CSP = [
  "default-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "connect-src 'none'",
  "media-src 'none'",
  "img-src data: cid:",
  "font-src data:",
  "style-src 'unsafe-inline'",
].join('; ')

const escapeAttribute = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const escapeText = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

const URL_ATTRIBUTES = new Set([
  'action', 'background', 'cite', 'data', 'formaction', 'href', 'poster',
  'src', 'srcdoc', 'srcset', 'xlink:href',
])

/**
 * sandbox 会拦截脚本和顶层导航，但不会阻止 iframe 自身通过 meta refresh、
 * 链接或表单访问外站。先剥离所有导航/嵌入入口，再交给 CSP 做第二层防护。
 */
const sanitizeEmailMarkup = (html: string): string => {
  if (typeof DOMParser === 'undefined') return `<pre>${escapeText(html)}</pre>`

  const document = new DOMParser().parseFromString(html, 'text/html')
  document.querySelectorAll('meta, link, base, script, iframe, frame, frameset, object, embed')
    .forEach((element) => element.remove())
  document.querySelectorAll('form').forEach((form) => form.replaceWith(...form.childNodes))

  document.querySelectorAll('*').forEach((element) => {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase()
      if (name.startsWith('on') || URL_ATTRIBUTES.has(name)) {
        // Inline/data images do not need to make a network request. Preserve
        // only common raster data URLs; cid attachments are not resolved here.
        const isSafeInlineImage = name === 'src'
          && element.tagName === 'IMG'
          && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(attribute.value.trim())
        if (!isSafeInlineImage) element.removeAttribute(attribute.name)
      }
    }

    const inlineStyle = element.getAttribute('style')
    if (inlineStyle && /(?:url|image-set)\s*\(/i.test(inlineStyle)) {
      element.removeAttribute('style')
    }
  })

  return document.body.innerHTML
}

/**
 * 邮件 HTML 永远放入无权限 sandbox iframe 中。CSP 额外阻止脚本、表单、
 * 子 frame 与远程图片，避免存储型 XSS 和像素追踪。
 */
export const buildSandboxedEmailHtml = (html: string | null | undefined) => `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${escapeAttribute(EMAIL_CSP)}">
  <style>
    :root { color-scheme: light; font-family: Inter, system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; max-width: 100%; }
    body { margin: 0; padding: 18px; color: #172033; background: #fff; line-height: 1.6; overflow-wrap: anywhere; }
    img { height: auto; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #d9e2ec; padding: 6px 8px; }
    a { color: #087f8c; text-decoration: underline; }
    pre { white-space: pre-wrap; }
  </style>
</head>
<body>${sanitizeEmailMarkup(html || '')}</body>
</html>`
