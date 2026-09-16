import { Router } from 'express';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './class.service';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/options',
  handler(async (req, res) => {
    ok(res, service.options(req));
  }),
);

router.get(
  '/:id',
  handler(async (req, res) => {
    ok(res, service.detail(num(req.params.id, 0)!));
  }),
);

router.post(
  '/',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增班级 ${input.name}`;
    ok(res, service.create(input), '班级已创建');
  }),
);

router.put(
  '/:id',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改班级 ${input.name}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '班级已保存');
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除班级 #${req.params.id}`;
    ok(res, true, '班级已删除');
  }),
);

export default router;
