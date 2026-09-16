/**
 * 数据库访问层：基于 Node.js 内置的 node:sqlite（无需任何原生依赖）
 * 统一导出 all / get / run / transaction，业务层不直接接触驱动 API。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config';

/** 驱动只接受 string | number | bigint | null | Uint8Array，这里做一次归一化 */
export type SqlParam = string | number | bigint | boolean | Date | null | undefined;

function normalize(params: SqlParam[]): (string | number | bigint | null | Uint8Array)[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });
}

function ensureDir(file: string) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createConnection(): DatabaseSync {
  ensureDir(config.dbFile);
  const db = new DatabaseSync(config.dbFile);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  return db;
}

export const db = createConnection();

function trace(sql: string, params: SqlParam[]) {
  if (!config.sqlDebug) return;
  // eslint-disable-next-line no-console
  console.log('[sql]', sql.replace(/\s+/g, ' ').trim(), params.length ? params : '');
}

export function all<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): T[] {
  trace(sql, params);
  return db.prepare(sql).all(...normalize(params)) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): T | undefined {
  trace(sql, params);
  return db.prepare(sql).get(...normalize(params)) as T | undefined;
}

export function run(sql: string, params: SqlParam[] = []): { changes: number; lastInsertRowid: number } {
  trace(sql, params);
  const result = db.prepare(sql).run(...normalize(params));
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

/** 取单个标量值（count / sum 等聚合查询） */
export function scalar<T = number>(sql: string, params: SqlParam[] = []): T {
  const row = get<Record<string, T>>(sql, params);
  if (!row) return 0 as unknown as T;
  return Object.values(row)[0];
}

/** 事务包装：回调内抛错则整体回滚 */
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** 读取 schema.sql（兼容 tsx 直跑与 tsc 编译后两种目录结构） */
export function readSchemaSql(): string {
  const candidates = [
    path.resolve(__dirname, 'schema.sql'),
    path.resolve(__dirname, '../../src/db/schema.sql'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`未找到 schema.sql，已尝试：${candidates.join(' | ')}`);
  return fs.readFileSync(found, 'utf8');
}
