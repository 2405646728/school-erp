import { reactive } from 'vue';
import { publicApi, type SiteInfo } from '@/api';

/** 官网全局信息（站点设置、导航单页、统计数据），全站共用一份，避免重复请求 */
export const siteState = reactive({
  loaded: false,
  loading: false,
  info: null as SiteInfo | null,
});

export async function loadSite(force = false) {
  if (siteState.loaded && !force) return siteState.info;
  if (siteState.loading) return siteState.info;
  siteState.loading = true;
  try {
    siteState.info = await publicApi.site();
    siteState.loaded = true;
    return siteState.info;
  } finally {
    siteState.loading = false;
  }
}

export function setting(key: string, fallback = ''): string {
  return siteState.info?.settings?.[key] || fallback;
}

/** 统一维护页面标题与 SEO 描述 */
export function useSeo(title?: string, description?: string) {
  const siteName = setting('site_name', '启明大学');
  document.title = title ? `${title} - ${siteName}` : siteName;

  const meta = document.querySelector('meta[name="description"]');
  const content = description || setting('site_description');
  if (meta && content) meta.setAttribute('content', content);
}

/** 后台管理端地址（默认本机 5173 端口） */
export const adminUrl = import.meta.env.VITE_ADMIN_URL || 'http://127.0.0.1:5173';

/** 日期格式化：只保留年月日 */
export function formatDay(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/** 展示用日期：YYYY-MM-DD HH:mm */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 16);
}

export function toDateParts(value: string | null | undefined) {
  const day = formatDay(value) || '—';
  const [year, month, date] = day.split('-');
  return { year, month: `${month}月`, date: `${date}日` };
}
