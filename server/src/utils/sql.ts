/** 轻量 SQL 组装工具，避免各模块重复手写 SET / VALUES 片段 */
import { get, run, type SqlParam } from '../db';
import { ApiError } from './http';

export function insert(table: string, data: Record<string, SqlParam>): number {
  const keys = Object.keys(data);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  return run(sql, keys.map((k) => data[k])).lastInsertRowid;
}

export function update(table: string, id: number, data: Record<string, SqlParam>): number {
  const keys = Object.keys(data);
  if (!keys.length) return 0;
  const sets = keys.map((k) => `${k} = ?`).join(', ');
  const sql = `UPDATE ${table} SET ${sets}, updated_at = datetime('now', 'localtime') WHERE id = ?`;
  return run(sql, [...keys.map((k) => data[k]), id]).changes;
}

export function remove(table: string, id: number): number {
  return run(`DELETE FROM ${table} WHERE id = ?`, [id]).changes;
}

/** 校验唯一约束，命中则抛出 409 */
export function assertUnique(
  table: string,
  column: string,
  value: SqlParam,
  excludeId?: number,
  label = '数据',
) {
  const sql = excludeId
    ? `SELECT id FROM ${table} WHERE ${column} = ? AND id <> ?`
    : `SELECT id FROM ${table} WHERE ${column} = ?`;
  const params = excludeId ? [value, excludeId] : [value];
  if (get(sql, params)) {
    throw ApiError.conflict(`${label}「${value}」已存在，请更换`);
  }
}

/** 取一条记录，不存在直接抛 404 */
export function mustExist<T>(table: string, id: number | null | undefined, label = '数据'): T {
  if (!id) throw ApiError.badRequest(`缺少 ${label} 标识`);
  const row = get<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  if (!row) throw ApiError.notFound(`${label}不存在或已被删除`);
  return row;
}

/** 只保留允许写入的字段 */
export function pick<T extends Record<string, unknown>>(
  source: Record<string, unknown>,
  fields: readonly (keyof T & string)[],
): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    const value = source[field];
    if (value !== undefined) result[field] = value;
  }
  return result as Partial<T>;
}
