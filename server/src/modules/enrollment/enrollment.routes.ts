import { Router } from 'express';
import { authenticate, canManage, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num, str } from '../../utils/query';
import * as service from './enrollment.service';

const router = Router();
router.use(authenticate);

/** 全院选课明细属于教务数据，仅管理员与教师可读 */
const canReadAll = requireRole('admin', 'teacher');

router.get(
  '/',
  canReadAll,
  handler(async (req, res) => {
    ok(res, service.list(req));
  }),
);

router.get(
  '/overview',
  canReadAll,
  handler(async (_req, res) => {
    ok(res, service.overview());
  }),
);

/** 学生端 */
router.get(
  '/my-courses',
  handler(async (req, res) => {
    ok(res, service.myCourses((req as AuthedRequest).user!, str(req.query.semester)));
  }),
);

router.get(
  '/my-scores',
  handler(async (req, res) => {
    ok(res, service.myScores((req as AuthedRequest).user!));
  }),
);

/** 教师端 */
router.get(
  '/my-teachings',
  handler(async (req, res) => {
    ok(res, service.myTeachings((req as AuthedRequest).user!, str(req.query.semester)));
  }),
);

/** 成绩批量录入 */
router.post(
  '/batch-score',
  canManage,
  handler(async (req, res) => {
    const input = service.scoreSchema.parse(req.body ?? {});
    const result = service.batchScore(input, (req as AuthedRequest).user!);
    (req as AuthedRequest).auditDetail = `录入成绩 ${result.updated} 条`;
    ok(res, result, `已保存 ${result.updated} 条成绩`);
  }),
);

/** 手工选课 */
router.post(
  '/select',
  canManage,
  handler(async (req, res) => {
    const input = service.selectSchema.parse(req.body ?? {});
    const result = service.selectCourse(input);
    (req as AuthedRequest).auditDetail = `为教学班 #${input.offeringId} 添加 ${result.added} 名学生`;
    ok(res, result, `已添加 ${result.added} 条选课记录`);
  }),
);

router.delete(
  '/:id',
  requireRole('admin', 'teacher'),
  handler(async (req, res) => {
    service.drop(num(req.params.id, 0)!, (req as AuthedRequest).user!);
    (req as AuthedRequest).auditDetail = `删除选课记录 #${req.params.id}`;
    ok(res, true, '选课记录已删除');
  }),
);

export default router;
