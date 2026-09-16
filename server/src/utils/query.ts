/** 列表查询通用参数解析（分页 + 关键字 + 排序白名单） */
import type { Request } from 'express';
import type { ListQuery } from '../types';

export interface ParsedListQuery extends ListQuery {
  sortBy: string;
  order: 'ASC' | 'DESC';
}

export function parseListQuery(req: Request, defaultPageSize = 10, maxPageSize = 200): ParsedListQuery {
  const rawPage = Number(req.query.page ?? 1);
  const rawSize = Number(req.query.pageSize ?? defaultPageSize);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawSize) && rawSize > 0 ? Math.min(Math.floor(rawSize), maxPageSize) : defaultPageSize;

  const sortBy = String(req.query.sortBy ?? '');
  const order = String(req.query.order ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return {
    page,
    pageSize,
    keyword: String(req.query.keyword ?? '').trim(),
    offset: (page - 1) * pageSize,
    sortBy,
    order,
  };
}

/** 排序字段白名单，防止 SQL 注入 */
export function safeSort(sortBy: string, allowed: Record<string, string>, fallback: string): string {
  return allowed[sortBy] ?? fallback;
}

export function num(value: unknown, fallback: number | null = null): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function str(value: unknown, fallback: string | null = null): string | null {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text === '' ? fallback : text;
}
