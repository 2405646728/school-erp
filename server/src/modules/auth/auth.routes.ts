import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import * as service from './auth.service';

const router = Router();

router.post(
  '/login',
  handler(async (req, res) => {
    const input = service.loginSchema.parse(req.body ?? {});
    const result = service.login(input);
    (req as AuthedRequest).auditDetail = `账号 ${input.username} 登录成功`;
    ok(res, result, '登录成功');
  }),
);

router.post(
  '/logout',
  handler(async (req, res) => {
    (req as AuthedRequest).auditDetail = '退出登录';
    ok(res, true, '已退出登录');
  }),
);

router.get(
  '/profile',
  authenticate,
  handler(async (req, res) => {
    ok(res, service.getProfile((req as AuthedRequest).user!));
  }),
);

router.put(
  '/profile',
  authenticate,
  handler(async (req, res) => {
    const input = service.profileSchema.parse(req.body ?? {});
    ok(res, service.updateProfile((req as AuthedRequest).user!, input), '资料已保存');
  }),
);

router.put(
  '/password',
  authenticate,
  handler(async (req, res) => {
    const input = service.passwordSchema.parse(req.body ?? {});
    service.changePassword((req as AuthedRequest).user!, input);
    ok(res, true, '密码修改成功');
  }),
);

export default router;
