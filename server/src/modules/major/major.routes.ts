import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './major.service';

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
    ok(res, service.options(num(req.query.departmentId)));
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
  requireRole('admin'),
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增专业 ${input.name}`;
    ok(res, service.create(input), '专业已创建');
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改专业 ${input.name}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '专业已保存');
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除专业 #${req.params.id}`;
    ok(res, true, '专业已删除');
  }),
);

export default router;
