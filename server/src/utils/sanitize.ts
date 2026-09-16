/**
 * 富文本基础净化：官网正文由后台管理员维护，这里做一层兜底防护，
 * 移除脚本、内联框架、事件属性与危险协议，避免存储型 XSS。
 */
const DANGEROUS_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'svg',
  'math',
];

export function sanitizeHtml(input: unknown): string {
  let html = String(input ?? '');
  if (!html) return '';

  for (const tag of DANGEROUS_TAGS) {
    // 成对标签连同内容一起移除
    html = html.replace(new RegExp(`<\\s*${tag}\\b[^>]*>[\\s\\S]*?<\\s*/\\s*${tag}\\s*>`, 'gi'), '');
    // 自闭合或残留的单个标签
    html = html.replace(new RegExp(`<\\s*/?\\s*${tag}\\b[^>]*>`, 'gi'), '');
  }

  // 内联事件处理器
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // 危险协议
  html = html.replace(
    /(href|src|xlink:href)\s*=\s*("|')\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi,
    '$1="#"',
  );
  html = html.replace(/\ssrcdoc\s*=\s*("[^"]*"|'[^']*')/gi, '');

  return html.trim();
}

/** 列表摘要：去掉标签、压缩空白 */
export function toPlainText(html: string, maxLength = 120): string {
  const text = String(html ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}
