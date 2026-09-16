import { Router } from 'express';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './course.service';

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
    (req as AuthedRequest).auditDetail = `新增课程 ${input.name}（${input.courseCode}）`;
    ok(res, service.create(input), '课程已创建');
  }),
);

router.put(
  '/:id',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改课程 ${input.name}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '课程已保存');
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除课程 #${req.params.id}`;
    ok(res, true, '课程已删除');
  }),
);

export default router;
