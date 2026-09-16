import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num, str } from '../../utils/query';
import * as service from './user.service';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get(
  '/',
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/stats',
  handler(async (_req, res) => {
    ok(res, service.stats());
  }),
);

router.get(
  '/bindable',
  handler(async (req, res) => {
    ok(res, service.bindable(str(req.query.role) ?? ''));
  }),
);

router.post(
  '/',
  handler(async (req, res) => {
    const input = service.createSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增账号 ${input.username}`;
    ok(res, service.create(input), `账号已创建，初始密码 ${service.DEFAULT_PASSWORD}`);
  }),
);

router.put(
  '/:id',
  handler(async (req, res) => {
    const input = service.updateSchema.parse(req.body ?? {});
    const operatorId = (req as AuthedRequest).user!.uid;
    (req as AuthedRequest).auditDetail = `修改账号 #${req.params.id}`;
    ok(res, service.edit(num(req.params.id, 0)!, input, operatorId), '账号已保存');
  }),
);

router.post(
  '/:id/toggle-status',
  handler(async (req, res) => {
    const status = service.toggleStatus(num(req.params.id, 0)!, (req as AuthedRequest).user!.uid);
    (req as AuthedRequest).auditDetail = `账号 #${req.params.id} 状态改为 ${status}`;
    ok(res, { status }, `账号已${status === '启用' ? '启用' : '停用'}`);
  }),
);

router.post(
  '/:id/reset-password',
  handler(async (req, res) => {
    const password = service.resetPassword(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `重置账号 #${req.params.id} 密码`;
    ok(res, { password }, `密码已重置为 ${password}`);
  }),
);

router.delete(
  '/:id',
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!, (req as AuthedRequest).user!.uid);
    (req as AuthedRequest).auditDetail = `删除账号 #${req.params.id}`;
    ok(res, true, '账号已删除');
  }),
);

export default router;
