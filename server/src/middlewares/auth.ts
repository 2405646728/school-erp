import type { NextFunction, Response } from 'express';
import { get } from '../db';
import type { AuthedRequest, Role, SysUserRow } from '../types';
import { ApiError } from '../utils/http';
import { verifyToken } from '../utils/jwt';

/** 解析 Bearer Token 并挂载 req.user */
export function authenticate(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(ApiError.unauthorized('缺少登录凭证'));

  try {
    const payload = verifyToken(token);
    const user = get<SysUserRow>('SELECT * FROM sys_user WHERE id = ?', [payload.uid]);
    if (!user) return next(ApiError.unauthorized('账号不存在'));
    if (user.status !== '启用') return next(ApiError.forbidden('账号已被停用，请联系管理员'));

    req.user = {
      uid: user.id,
      username: user.username,
      role: user.role,
      realName: user.real_name,
      refId: user.ref_id,
    };
    next();
  } catch {
    next(ApiError.unauthorized('登录已过期，请重新登录'));
  }
}

/** 角色校验，用法：requireRole('admin') / requireRole('admin', 'teacher') */
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
}

/** 管理员或教务（教师）可写 */
export const canManage = requireRole('admin', 'teacher');
