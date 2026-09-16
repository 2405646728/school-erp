/** 展示格式化工具 */

export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const text = String(value);
  if (!withTime) return text.slice(0, 10);
  return text.length > 16 ? text.slice(0, 16) : text;
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return value.toLocaleString('zh-CN');
}

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}

/** 根据学期字符串推算「上一学期」，用于选课/查分默认值 */
export function currentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}-1` : `${year - 1}-${year}-2`;
}

export function genderIcon(gender: string): string {
  return gender === '女' ? 'female' : 'male';
}

export function percent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}
