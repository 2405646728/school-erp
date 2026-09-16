import type { Request } from 'express';
import { all, scalar } from '../../db';
import { page } from '../../utils/http';
import { parseListQuery, safeSort, str } from '../../utils/query';

const SORTABLE: Record<string, string> = {
  createdAt: 'l.created_at',
  module: 'l.module',
  username: 'l.username',
};

export function list(req: Request) {
  const query = parseListQuery(req, 15);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(l.username LIKE ? OR l.detail LIKE ? OR l.path LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like, like);
  }
  const module = str(req.query.module);
  if (module) {
    where.push('l.module = ?');
    params.push(module);
  }
  const action = str(req.query.action);
  if (action) {
    where.push('l.action = ?');
    params.push(action);
  }
  const success = str(req.query.success);
  if (success === '1' || success === '0') {
    where.push('l.success = ?');
    params.push(Number(success));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(`SELECT COUNT(*) FROM sys_log l ${whereSql}`, params);
  const list = all<Record<string, unknown>>(
    `SELECT l.* FROM sys_log l ${whereSql}
     ORDER BY ${safeSort(query.sortBy, SORTABLE, 'l.created_at')} ${query.order}, l.id DESC
     LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  );

  return page(list, total, query.page, query.pageSize);
}

/** 日志页筛选项 */
export function filters() {
  return {
    modules: all<{ value: string }>(`SELECT DISTINCT module AS value FROM sys_log ORDER BY module`).map(
      (row) => row.value,
    ),
    actions: all<{ value: string }>(`SELECT DISTINCT action AS value FROM sys_log ORDER BY action`).map(
      (row) => row.value,
    ),
  };
}

export function clearBefore(days: number) {
  const result = scalar<number>(
    `SELECT COUNT(*) FROM sys_log WHERE created_at < datetime('now', 'localtime', ?)`,
    [`-${days} days`],
  );
  return result;
}
