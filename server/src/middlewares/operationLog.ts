import type { NextFunction, Response } from 'express';
import { run } from '../db';
import { config } from '../config';
import type { AuthedRequest } from '../types';

const MODULE_LABELS: Record<string, string> = {
  students: '学生管理',
  teachers: '教师管理',
  courses: '课程管理',
  offerings: '开课管理',
  enrollments: '选课成绩',
  departments: '院系管理',
  majors: '专业管理',
  classes: '班级管理',
  users: '用户管理',
  auth: '身份认证',
};

const ACTION_LABELS: Record<string, string> = {
  POST: '新增',
  PUT: '修改',
  PATCH: '修改',
  DELETE: '删除',
};

/** 记录所有写操作，供「操作日志」页面查询 */
export function operationLog(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.method === 'GET') return next();
  const startedAt = Date.now();

  res.on('finish', () => {
    try {
      const segments = req.originalUrl.split('?')[0].split('/').filter(Boolean);
      const moduleKey = segments[1] || 'system';
      const moduleLabel = MODULE_LABELS[moduleKey] || '系统';
      const action = ACTION_LABELS[req.method] || req.method;

      run(
        `INSERT INTO sys_log (user_id, username, module, action, method, path, ip, detail, success, cost_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.uid ?? null,
          req.user?.username ?? 'anonymous',
          moduleLabel,
          action,
          req.method,
          req.originalUrl,
          (req.headers['x-forwarded-for'] as string) || req.ip || '',
          req.auditDetail ?? null,
          res.statusCode < 400 ? 1 : 0,
          Date.now() - startedAt,
        ],
      );
    } catch (error) {
      if (config.sqlDebug) console.error('[operationLog]', error);
    }
  });

  next();
}
