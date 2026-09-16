import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './department.service';

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
  handler(async (_req, res) => {
    ok(res, service.options());
  }),
);

router.get(
  '/summary',
  handler(async (_req, res) => {
    ok(res, service.summary());
  }),
);

router.get(
  '/:id',
  handler(async (req, res) => {
    ok(res, service.detail(Number(req.params.id)));
  }),
);

router.post(
  '/',
  requireRole('admin'),
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    const created = service.create(input);
    (req as AuthedRequest).auditDetail = `新增院系 ${input.name}`;
    ok(res, created, '院系已创建');
  }),
);

router.put(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    const updated = service.edit(Number(req.params.id), input);
    (req as AuthedRequest).auditDetail = `修改院系 ${input.name}`;
    ok(res, updated, '院系已保存');
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除院系 #${req.params.id}`;
    ok(res, true, '院系已删除');
  }),
);

export default router;
