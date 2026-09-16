import { Router } from 'express';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './teacher.service';

const router = Router();
router.use(authenticate);

/** 教师名册属于教务数据，仅管理员与教师可读 */
const canReadRoster = requireRole('admin', 'teacher');

router.get(
  '/',
  canReadRoster,
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/options',
  handler(async (_req, res) => {
    ok(res, service.options());
  }),
);

router.get(
  '/stats',
  handler(async (_req, res) => {
    ok(res, service.statByTitle());
  }),
);

router.get(
  '/:id',
  canReadRoster,
  handler(async (req, res) => {
    ok(res, service.detail(num(req.params.id, 0)!));
  }),
);

router.post(
  '/',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增教师 ${input.name}（${input.teacherNo}）`;
    ok(res, service.create(input), '教师已创建，登录账号为工号，初始密码 123456');
  }),
);

router.put(
  '/:id',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改教师 ${input.name}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '教师信息已保存');
  }),
);

router.post(
  '/:id/reset-password',
  requireRole('admin'),
  handler(async (req, res) => {
    const password = service.resetPassword(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `重置教师 #${req.params.id} 登录密码`;
    ok(res, { password }, `密码已重置为 ${password}`);
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除教师 #${req.params.id}`;
    ok(res, true, '教师已删除');
  }),
);

export default router;
