import type { Request } from 'express';
import { z } from 'zod';
import { all, get, scalar } from '../../db';
import type { SysUserRow } from '../../types';
import { ApiError, page } from '../../utils/http';
import { parseListQuery, safeSort, str } from '../../utils/query';
import { assertUnique, insert, mustExist, remove, update } from '../../utils/sql';
import { hashPassword } from '../../utils/password';

export const DEFAULT_PASSWORD = '123456';

export const createSchema = z.object({
  username: z
    .string()
    .min(3, '账号至少 3 位')
    .max(30)
    .regex(/^[A-Za-z0-9_.]+$/, '账号只能包含字母、数字、下划线和点'),
  realName: z.string().min(2, '姓名至少 2 个字符').max(30),
  role: z.enum(['admin', 'teacher', 'student']),
  refId: z.number().int().positive().nullable().optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
  status: z.enum(['启用', '停用']),
});

export const updateSchema = z.object({
  realName: z.string().min(2, '姓名至少 2 个字符').max(30),
  role: z.enum(['admin', 'teacher', 'student']),
  refId: z.number().int().positive().nullable().optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
  status: z.enum(['启用', '停用']),
});

const SORTABLE: Record<string, string> = {
  username: 'u.username',
  realName: 'u.real_name',
  createdAt: 'u.created_at',
  lastLoginAt: 'u.last_login_at',
};

const ROLE_LABEL: Record<string, string> = { admin: '系统管理员', teacher: '教师', student: '学生' };

export function list(req: Request) {
  const query = parseListQuery(req);
  const sortColumn = safeSort(query.sortBy, SORTABLE, 'u.id');

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (query.keyword) {
    where.push('(u.username LIKE ? OR u.real_name LIKE ?)');
    const like = `%${query.keyword}%`;
    params.push(like, like);
  }
  const role = str(req.query.role);
  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }
  const status = str(req.query.status);
  if (status) {
    where.push('u.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = scalar<number>(`SELECT COUNT(*) FROM sys_user u ${whereSql}`, params);
  const list = all<Omit<SysUserRow, 'password'> & { role_label: string }>(
    `SELECT u.id, u.username, u.real_name, u.role, u.ref_id, u.phone, u.email, u.avatar,
            u.status, u.last_login_at, u.created_at, u.updated_at
     FROM sys_user u ${whereSql}
     ORDER BY ${sortColumn} ${query.order}, u.id ASC LIMIT ? OFFSET ?`,
    [...params, query.pageSize, query.offset],
  ).map((row) => ({ ...row, role_label: ROLE_LABEL[row.role] ?? row.role }));

  return page(list, total, query.page, query.pageSize);
}

export function create(input: z.infer<typeof createSchema>) {
  assertUnique('sys_user', 'username', input.username, undefined, '登录账号');
  if (input.role === 'student' && input.refId) mustExist('student', input.refId, '学生');
  if (input.role === 'teacher' && input.refId) mustExist('teacher', input.refId, '教师');

  const id = insert('sys_user', {
    username: input.username,
    password: hashPassword(DEFAULT_PASSWORD),
    real_name: input.realName,
    role: input.role,
    ref_id: input.refId ?? null,
    phone: str(input.phone),
    email: str(input.email),
    status: input.status,
  });
  return get<Omit<SysUserRow, 'password'>>(
    `SELECT id, username, real_name, role, ref_id, phone, email, avatar, status, last_login_at, created_at, updated_at
     FROM sys_user WHERE id = ?`,
    [id],
  );
}

export function edit(id: number, input: z.infer<typeof updateSchema>, operatorId: number) {
  const target = mustExist<SysUserRow>('sys_user', id, '账号');
  if (target.id === operatorId && input.status === '停用') {
    throw ApiError.badRequest('不能停用当前登录的账号');
  }
  if (target.id === operatorId && input.role !== 'admin') {
    throw ApiError.badRequest('不能修改当前登录账号的角色');
  }
  if (input.role === 'student' && input.refId) mustExist('student', input.refId, '学生');
  if (input.role === 'teacher' && input.refId) mustExist('teacher', input.refId, '教师');

  update('sys_user', id, {
    real_name: input.realName,
    role: input.role,
    ref_id: input.refId ?? null,
    phone: str(input.phone),
    email: str(input.email),
    status: input.status,
  });
  return { id };
}

export function destroy(id: number, operatorId: number) {
  const target = mustExist<SysUserRow>('sys_user', id, '账号');
  if (target.id === operatorId) throw ApiError.badRequest('不能删除当前登录的账号');
  if (target.username === 'admin') throw ApiError.badRequest('内置管理员账号不允许删除');

  const admins = scalar<number>(`SELECT COUNT(*) FROM sys_user WHERE role = 'admin' AND status = '启用'`);
  if (target.role === 'admin' && admins <= 1) throw ApiError.badRequest('系统至少保留一个启用的管理员账号');

  remove('sys_user', id);
  return true;
}

export function resetPassword(id: number) {
  mustExist('sys_user', id, '账号');
  update('sys_user', id, { password: hashPassword(DEFAULT_PASSWORD) });
  return DEFAULT_PASSWORD;
}

export function toggleStatus(id: number, operatorId: number) {
  const target = mustExist<SysUserRow>('sys_user', id, '账号');
  if (target.id === operatorId) throw ApiError.badRequest('不能停用当前登录的账号');
  const next = target.status === '启用' ? '停用' : '启用';
  update('sys_user', id, { status: next });
  return next;
}

/** 可绑定档案下拉：教师/学生 */
export function bindable(role: string) {
  if (role === 'teacher') {
    return all<{ id: number; label: string }>(
      `SELECT id, teacher_no || ' ' || name AS label FROM teacher ORDER BY teacher_no`,
    );
  }
  if (role === 'student') {
    return all<{ id: number; label: string }>(
      `SELECT id, student_no || ' ' || name AS label FROM student ORDER BY student_no LIMIT 500`,
    );
  }
  return [];
}

export function stats() {
  return all<{ name: string; value: number }>(
    `SELECT role AS name, COUNT(*) AS value FROM sys_user GROUP BY role`,
  ).map((row) => ({ name: ROLE_LABEL[row.name] ?? row.name, value: row.value }));
}

export function findUsername(username: string) {
  return get(`SELECT id FROM sys_user WHERE username = ?`, [username]);
}
