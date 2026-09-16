import { Router } from 'express';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './offering.service';

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
  '/semesters',
  handler(async (_req, res) => {
    ok(res, service.semesters());
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
    (req as AuthedRequest).auditDetail = `新增教学班 ${input.offeringCode}`;
    ok(res, service.create(input), '教学班已创建');
  }),
);

router.put(
  '/:id',
  canManage,
  handler(async (req, res) => {
    const input = service.upsertSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改教学班 ${input.offeringCode}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '教学班已保存');
  }),
);

router.post(
  '/:id/students',
  canManage,
  handler(async (req, res) => {
    const { studentIds } = service.enrollSchema.parse(req.body ?? {});
    const result = service.enrollStudents(num(req.params.id, 0)!, studentIds);
    (req as AuthedRequest).auditDetail = `教学班 #${req.params.id} 添加学生 ${result.added} 人`;
    ok(res, result, `已添加 ${result.added} 名学生${result.skipped ? `，${result.skipped} 名已在名单中` : ''}`);
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除教学班 #${req.params.id}`;
    ok(res, true, '教学班已删除');
  }),
);

export default router;
