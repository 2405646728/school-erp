import { Router } from 'express';
import { run } from '../../db';
import { authenticate, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './log.service';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get(
  '/',
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/filters',
  handler(async (_req, res) => {
    ok(res, service.filters());
  }),
);

router.delete(
  '/clean',
  handler(async (req, res) => {
    const days = num(req.query.days, 30) ?? 30;
    const deleted = run(`DELETE FROM sys_log WHERE created_at < datetime('now', 'localtime', ?)`, [
      `-${days} days`,
    ]).changes;
    (req as AuthedRequest).auditDetail = `清理 ${days} 天前的操作日志 ${deleted} 条`;
    ok(res, { deleted }, `已清理 ${deleted} 条历史日志`);
  }),
);

export default router;
