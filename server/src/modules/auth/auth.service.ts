import { z } from 'zod';
import { get, run } from '../../db';
import type { AuthUser, SysUserRow } from '../../types';
import { ApiError } from '../../utils/http';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';

export const loginSchema = z.object({
  username: z.string().min(1, '请输入账号').max(50),
  password: z.string().min(1, '请输入密码').max(64),
});

export const passwordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少 6 位').max(64),
});

export const profileSchema = z.object({
  realName: z.string().min(1, '姓名不能为空').max(30).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().max(60).optional().nullable(),
});

export interface LoginResult {
  token: string;
  user: AuthUser & { avatar: string | null; phone: string | null; email: string | null };
}

export function login(input: z.infer<typeof loginSchema>): LoginResult {
  const user = get<SysUserRow>('SELECT * FROM sys_user WHERE username = ?', [input.username]);
  if (!user || !verifyPassword(input.password, user.password)) {
    throw new ApiError('账号或密码不正确', 401, 401);
  }
  if (user.status !== '启用') throw ApiError.forbidden('账号已被停用，请联系管理员');

  run(`UPDATE sys_user SET last_login_at = datetime('now', 'localtime') WHERE id = ?`, [user.id]);

  const authUser: AuthUser = {
    uid: user.id,
    username: user.username,
    role: user.role,
    realName: user.real_name,
    refId: user.ref_id,
  };

  return {
    token: signToken(authUser),
    user: { ...authUser, avatar: user.avatar, phone: user.phone, email: user.email },
  };
}

/** 个人中心：账号信息 + 关联的教师/学生档案 */
export function getProfile(auth: AuthUser) {
  const account = get<Omit<SysUserRow, 'password'>>(
    `SELECT id, username, real_name, role, ref_id, phone, email, avatar, status, last_login_at, created_at, updated_at
     FROM sys_user WHERE id = ?`,
    [auth.uid],
  );
  if (!account) throw ApiError.notFound('账号不存在');

  let teacher: Record<string, unknown> | undefined;
  let student: Record<string, unknown> | undefined;

  if (auth.role === 'teacher' && auth.refId) {
    teacher = get(
      `SELECT t.*, d.name AS department_name FROM teacher t
       LEFT JOIN department d ON d.id = t.department_id WHERE t.id = ?`,
      [auth.refId],
    );
  }
  if (auth.role === 'student' && auth.refId) {
    student = get(
      `SELECT s.*, c.name AS class_name, c.grade_year, m.name AS major_name, d.name AS department_name
       FROM student s
       LEFT JOIN class_group c ON c.id = s.class_id
       LEFT JOIN major m ON m.id = c.major_id
       LEFT JOIN department d ON d.id = m.department_id
       WHERE s.id = ?`,
      [auth.refId],
    );
  }

  return { account, teacher: teacher ?? null, student: student ?? null };
}

export function updateProfile(auth: AuthUser, input: z.infer<typeof profileSchema>) {
  const fields: string[] = [];
  const params: (string | null)[] = [];

  if (input.realName !== undefined) {
    fields.push('real_name = ?');
    params.push(input.realName);
  }
  if (input.phone !== undefined) {
    fields.push('phone = ?');
    params.push(input.phone);
  }
  if (input.email !== undefined) {
    fields.push('email = ?');
    params.push(input.email);
  }
  if (!fields.length) throw ApiError.badRequest('没有需要更新的内容');

  run(
    `UPDATE sys_user SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`,
    [...params, auth.uid],
  );
  return getProfile(auth);
}

export function changePassword(auth: AuthUser, input: z.infer<typeof passwordSchema>) {
  const user = get<SysUserRow>('SELECT * FROM sys_user WHERE id = ?', [auth.uid]);
  if (!user) throw ApiError.notFound('账号不存在');
  if (!verifyPassword(input.oldPassword, user.password)) {
    throw ApiError.badRequest('原密码不正确');
  }
  if (input.oldPassword === input.newPassword) {
    throw ApiError.badRequest('新密码不能与原密码相同');
  }
  run(`UPDATE sys_user SET password = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`, [
    hashPassword(input.newPassword),
    auth.uid,
  ]);
  return true;
}
