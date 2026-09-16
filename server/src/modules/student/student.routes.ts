import { Router } from 'express';
import { z } from 'zod';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './student.service';

const router = Router();
router.use(authenticate);

/** 学生名册属于教务数据：仅管理员与教师可读，学生本人通过个人中心查看自己的档案 */
const canReadRoster = requireRole('admin', 'teacher');

router.get(
  '/',
  canReadRoster,
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/statistics',
  canReadRoster,
  handler(async (_req, res) => {
    ok(res, service.statistics());
  }),
);

/** 导出 CSV：浏览器直接下载文件流 */
router.get(
  '/export',
  canReadRoster,
  handler(async (req, res) => {
    const { filename, content } = service.exportCsv(req);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  }),
);

router.post(
  '/import',
  canManage,
  handler(async (req, res) => {
    const { rows } = service.importSchema.parse(req.body ?? {});
    const result = service.importStudents(rows);
    (req as AuthedRequest).auditDetail = `批量导入学生：成功 ${result.success} 条，失败 ${result.failed} 条`;
    ok(res, result, `导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`);
  }),
);

router.post(
  '/batch-delete',
  requireRole('admin'),
  handler(async (req, res) => {
    const { ids } = z.object({ ids: z.array(z.number().int().positive()).min(1) }).parse(req.body ?? {});
    const deleted = service.batchDelete(ids);
    (req as AuthedRequest).auditDetail = `批量删除学生 ${deleted} 条`;
    ok(res, { deleted }, `已删除 ${deleted} 名学生`);
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
    const input = service.createSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增学生 ${input.name}（${input.studentNo}）`;
    ok(res, service.create(input), '学生已创建，登录账号为学号，初始密码 123456');
  }),
);

router.put(
  '/:id',
  canManage,
  handler(async (req, res) => {
    const input = service.updateSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改学生 ${input.name}`;
    ok(res, service.edit(num(req.params.id, 0)!, input), '学生信息已保存');
  }),
);

router.post(
  '/:id/reset-password',
  canManage,
  handler(async (req, res) => {
    const password = service.resetPassword(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `重置学生 #${req.params.id} 登录密码`;
    ok(res, { password }, `密码已重置为 ${password}`);
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  handler(async (req, res) => {
    service.destroy(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除学生 #${req.params.id}`;
    ok(res, true, '学生已删除');
  }),
);

export default router;
