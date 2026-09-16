/** 官网内容管理（后台）：轮播图 / 文章 / 单页 / 站点设置 */
import type { Request } from 'express';
import { z } from 'zod';
import { all, get, run, scalar, transaction } from '../../db';
import { ApiError, page } from '../../utils/http';
import { num, parseListQuery, safeSort, str } from '../../utils/query';
import { sanitizeHtml, toPlainText } from '../../utils/sanitize';
import { insert, mustExist, remove, update } from '../../utils/sql';

export const ARTICLE_CATEGORIES = ['学校新闻', '通知公告', '学术活动', '招生信息'];

export const bannerSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字符').max(80),
  subtitle: z.string().max(120).optional().nullable(),
  image: z.string().max(255).optional().nullable(),
  link: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  status: z.enum(['已发布', '草稿']),
});

export const articleSchema = z.object({
  title: z.string().min(2, '标题至少 2 个字符').max(120),
  category: z.enum(['学校新闻', '通知公告', '学术活动', '招生信息']),
  summary: z.string().max(255).optional().nullable(),
  cover: z.string().max(255).optional().nullable(),
  content: z.string().max(60000).optional().nullable(),
  author: z.string().max(40).optional().nullable(),
  source: z.string().max(60).optional().nullable(),
  tags: z.string().max(120).optional().nullable(),
  status: z.enum(['草稿', '已发布']),
  isTop: z.number().int().min(0).max(1).optional(),
  seoTitle: z.string().max(120).optional().nullable(),
  seoKeywords: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(255).optional().nullable(),
});

export const pageSchema = z.object({
  slug: z
    .string()
    .min(2, '页面标识至少 2 位')
    .max(40)
    .regex(/^[a-z0-9-]+$/, '页面标识只能包含小写字母、数字与连字符'),
  title: z.string().min(2, '标题至少 2 个字符').max(60),
  subtitle: z.string().max(80).optional().nullable(),
  content: z.string().max(60000).optional().nullable(),
  seoTitle: z.string().max(120).optional().nullable(),
  seoKeywords: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(255).optional().nullable(),
  status: z.enum(['已发布', '草稿']),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const settingSchema = z.object({
  items: z.array(z.object({ key: z.string().min(1).max(60), value: z.string().max(500) })).min(1),
});

// ---------------------------------------------------------------- 轮播图
export function bannerList() {
  return all<Record<string, unknown>>(`SELECT * FROM cms_banner ORDER BY sort_order ASC, id DESC`);
}

export function bannerCreate(input: z.infer<typeof bannerSchema>) {
  const id = insert('cms_banner', {
    title: input.title,
    subtitle: str(input.subtitle),
    image: str(input.image),
    link: str(input.link),
    sort_order: input.sortOrder ?? 0,
    status: input.status,
  });
  return get(`SELECT * FROM cms_banner WHERE id = ?`, [id]);
}

export function bannerUpdate(id: number, input: z.infer<typeof bannerSchema>) {
  mustExist('cms_banner', id, '轮播图');
  update('cms_banner', id, {
    title: input.title,
    subtitle: str(input.subtitle),
    image: str(input.image),
    link: str(input.link),
    sort_order: input.sortOrder ?? 0,
    status: input.status,
  });
  return get(`SELECT * FROM cms_banner WHERE id = ?`, [id]);
}

export function bannerRemove(id: number) {
  mustExist('cms_banner', id, '轮播图');
  remove('cms_banner', id);
  return true;
}

/** 上移 / 下移：与相邻记录交换排序值 */
export function bannerMove(id: number, direction: 'up' | 'down') {
  const current = mustExist<{ id: number; sort_order: number }>('cms_banner', id, '轮播图');
  const neighbour = get<{ id: number; sort_order: number }>(
    direction === 'up'
      ? `SELECT id, sort_order FROM cms_banner WHERE sort_order < ? OR (sort_order = ? AND id < ?)
         ORDER BY sort_order DESC, id DESC LIMIT 1`
      : `SELECT id, sort_order FROM cms_banner WHERE sort_order > ? OR (sort_order = ? AND id > ?)
         ORDER BY sort_order ASC, id ASC LIMIT 1`,
    [current.sort_order, current.sort_order, current.id],
  );
  if (!neighbour) return bannerList();

  transaction(() => {
    update('cms_banner', current.id, { sort_order: neighbour.sort_order });
    update('cms_banner', neighbour.id, { sort_order: current.sort_order });
  });
  return bannerList();
}

// ---------------------------------------------------------------- 文章
const ARTICLE_SORTABLE: Record<string, string> = {
  publishedAt: 'published_at',
  createdAt: 'created_at',
  viewCount: 'view_count',
  isTop: 'is_top',
};

export function articleList(req: Request) {
  const query = parseListQuery(req, 10);
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.keyword) {
    where.push('(title LIKE ? OR summary LIKE ? OR tags LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const category = str(req.query.category);
  if (category) {
    where.push('category = ?');
    params.push(category);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(`SELECT COUNT(*) FROM cms_article ${whereSql}`, params);
  const list = all<Record<string, unknown>>(
    `SELECT id, title, category, summary, cover, author, source, tags, status, is_top, view_count,
            seo_title, seo_keywords, seo_description, published_at, created_at, updated_at
     FROM cms_article ${whereSql}
     ORDER BY ${safeSort(query.sortBy, ARTICLE_SORTABLE, 'is_top')} DESC, published_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

export function articleDetail(id: number) {
  const row = mustExist<Record<string, unknown>>('cms_article', id, '文章');
  return row;
}

function articleColumns(input: z.infer<typeof articleSchema>) {
  const content = sanitizeHtml(input.content);
  return {
    title: input.title,
    category: input.category,
    summary: str(input.summary) ?? toPlainText(content, 120),
    cover: str(input.cover),
    content,
    author: str(input.author),
    source: str(input.source),
    tags: str(input.tags),
    status: input.status,
    is_top: input.isTop ?? 0,
    seo_title: str(input.seoTitle) ?? input.title,
    seo_keywords: str(input.seoKeywords),
    seo_description: str(input.seoDescription) ?? str(input.summary),
  };
}

export function articleCreate(input: z.infer<typeof articleSchema>) {
  const columns = articleColumns(input);
  const id = insert('cms_article', {
    ...columns,
    published_at: input.status === '已发布' ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
  });
  return articleDetail(id);
}

export function articleUpdate(id: number, input: z.infer<typeof articleSchema>) {
  const existing = mustExist<{ published_at: string | null }>('cms_article', id, '文章');
  const columns = articleColumns(input);
  update('cms_article', id, {
    ...columns,
    published_at:
      input.status === '已发布'
        ? existing.published_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
        : existing.published_at,
  });
  return articleDetail(id);
}

/** 发布 / 下线切换 */
export function articleToggleStatus(id: number) {
  const row = mustExist<{ status: string; published_at: string | null }>('cms_article', id, '文章');
  const status = row.status === '已发布' ? '草稿' : '已发布';
  update('cms_article', id, {
    status,
    published_at:
      status === '已发布'
        ? row.published_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
        : row.published_at,
  });
  return { status };
}

export function articleToggleTop(id: number) {
  const row = mustExist<{ is_top: number }>('cms_article', id, '文章');
  const isTop = row.is_top ? 0 : 1;
  update('cms_article', id, { is_top: isTop });
  return { isTop };
}

export function articleRemove(id: number) {
  mustExist('cms_article', id, '文章');
  remove('cms_article', id);
  return true;
}

export function articleStats() {
  return {
    total: scalar<number>(`SELECT COUNT(*) FROM cms_article`),
    published: scalar<number>(`SELECT COUNT(*) FROM cms_article WHERE status = '已发布'`),
    draft: scalar<number>(`SELECT COUNT(*) FROM cms_article WHERE status = '草稿'`),
    views: scalar<number>(`SELECT IFNULL(SUM(view_count), 0) FROM cms_article`),
    byCategory: all<{ name: string; value: number }>(
      `SELECT category AS name, COUNT(*) AS value FROM cms_article GROUP BY category`,
    ),
  };
}

// ---------------------------------------------------------------- 单页
export function pageList() {
  return all<Record<string, unknown>>(`SELECT * FROM cms_page ORDER BY sort_order ASC, id ASC`);
}

export function pageDetail(id: number) {
  return mustExist<Record<string, unknown>>('cms_page', id, '页面');
}

export function pageCreate(input: z.infer<typeof pageSchema>) {
  if (get(`SELECT id FROM cms_page WHERE slug = ?`, [input.slug])) {
    throw ApiError.conflict(`页面标识「${input.slug}」已被占用`);
  }
  const id = insert('cms_page', {
    slug: input.slug,
    title: input.title,
    subtitle: str(input.subtitle),
    content: sanitizeHtml(input.content),
    seo_title: str(input.seoTitle) ?? input.title,
    seo_keywords: str(input.seoKeywords),
    seo_description: str(input.seoDescription),
    status: input.status,
    sort_order: input.sortOrder ?? 0,
  });
  return pageDetail(id);
}

export function pageUpdate(id: number, input: z.infer<typeof pageSchema>) {
  mustExist('cms_page', id, '页面');
  const conflict = get<{ id: number }>(`SELECT id FROM cms_page WHERE slug = ? AND id <> ?`, [
    input.slug,
    id,
  ]);
  if (conflict) throw ApiError.conflict(`页面标识「${input.slug}」已被占用`);

  update('cms_page', id, {
    slug: input.slug,
    title: input.title,
    subtitle: str(input.subtitle),
    content: sanitizeHtml(input.content),
    seo_title: str(input.seoTitle) ?? input.title,
    seo_keywords: str(input.seoKeywords),
    seo_description: str(input.seoDescription),
    status: input.status,
    sort_order: input.sortOrder ?? 0,
  });
  return pageDetail(id);
}

export function pageRemove(id: number) {
  const row = mustExist<{ slug: string }>('cms_page', id, '页面');
  const reserved = ['about', 'admissions', 'contact', 'campus'];
  if (reserved.includes(row.slug)) {
    throw ApiError.badRequest('该页面为官网导航内置页面，如需下线请将状态改为「草稿」');
  }
  remove('cms_page', id);
  return true;
}

// ---------------------------------------------------------------- 站点设置
export function settings() {
  return all<{ key: string; value: string; label: string | null }>(
    `SELECT key, value, label FROM cms_setting ORDER BY rowid ASC`,
  );
}

export function updateSettings(input: z.infer<typeof settingSchema>) {
  transaction(() => {
    for (const item of input.items) {
      run(
        `INSERT INTO cms_setting (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now', 'localtime')`,
        [item.key, item.value],
      );
    }
  });
  return settings();
}
