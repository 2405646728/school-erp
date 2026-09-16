import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth';
import type { AuthedRequest } from '../../types';
import { handler, ok } from '../../utils/http';
import { num, str } from '../../utils/query';
import * as service from './cms.service';

/** 官网内容管理：仅系统管理员可访问 */
const router = Router();
router.use(authenticate, requireRole('admin'));

// ---------------- 轮播图 ----------------
router.get(
  '/banners',
  handler(async (_req, res) => {
    ok(res, service.bannerList());
  }),
);

router.post(
  '/banners',
  handler(async (req, res) => {
    const input = service.bannerSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增轮播图 ${input.title}`;
    ok(res, service.bannerCreate(input), '轮播图已创建');
  }),
);

router.put(
  '/banners/:id',
  handler(async (req, res) => {
    const input = service.bannerSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改轮播图 ${input.title}`;
    ok(res, service.bannerUpdate(num(req.params.id, 0)!, input), '轮播图已保存');
  }),
);

router.post(
  '/banners/:id/move',
  handler(async (req, res) => {
    const direction = str(req.query.direction) === 'up' ? 'up' : 'down';
    (req as AuthedRequest).auditDetail = `调整轮播图排序 #${req.params.id}`;
    ok(res, service.bannerMove(num(req.params.id, 0)!, direction), '排序已调整');
  }),
);

router.delete(
  '/banners/:id',
  handler(async (req, res) => {
    service.bannerRemove(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除轮播图 #${req.params.id}`;
    ok(res, true, '轮播图已删除');
  }),
);

// ---------------- 文章 ----------------
router.get(
  '/articles/stats',
  handler(async (_req, res) => {
    ok(res, service.articleStats());
  }),
);

router.get(
  '/articles',
  handler(async (req, res) => {
    ok(res, service.articleList(req));
  }),
);

router.get(
  '/articles/:id',
  handler(async (req, res) => {
    ok(res, service.articleDetail(num(req.params.id, 0)!));
  }),
);

router.post(
  '/articles',
  handler(async (req, res) => {
    const input = service.articleSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `发布文章 ${input.title}`;
    ok(res, service.articleCreate(input), input.status === '已发布' ? '文章已发布' : '草稿已保存');
  }),
);

router.put(
  '/articles/:id',
  handler(async (req, res) => {
    const input = service.articleSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改文章 ${input.title}`;
    ok(res, service.articleUpdate(num(req.params.id, 0)!, input), '文章已保存');
  }),
);

router.post(
  '/articles/:id/toggle-status',
  handler(async (req, res) => {
    const result = service.articleToggleStatus(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `文章 #${req.params.id} 状态改为 ${result.status}`;
    ok(res, result, `文章已${result.status === '已发布' ? '发布' : '转为草稿'}`);
  }),
);

router.post(
  '/articles/:id/toggle-top',
  handler(async (req, res) => {
    const result = service.articleToggleTop(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `文章 #${req.params.id} ${result.isTop ? '置顶' : '取消置顶'}`;
    ok(res, result, result.isTop ? '已置顶' : '已取消置顶');
  }),
);

router.delete(
  '/articles/:id',
  handler(async (req, res) => {
    service.articleRemove(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除文章 #${req.params.id}`;
    ok(res, true, '文章已删除');
  }),
);

// ---------------- 单页 ----------------
router.get(
  '/pages',
  handler(async (_req, res) => {
    ok(res, service.pageList());
  }),
);

router.post(
  '/pages',
  handler(async (req, res) => {
    const input = service.pageSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `新增单页 ${input.title}`;
    ok(res, service.pageCreate(input), '页面已创建');
  }),
);

router.put(
  '/pages/:id',
  handler(async (req, res) => {
    const input = service.pageSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `修改单页 ${input.title}`;
    ok(res, service.pageUpdate(num(req.params.id, 0)!, input), '页面已保存');
  }),
);

router.delete(
  '/pages/:id',
  handler(async (req, res) => {
    service.pageRemove(num(req.params.id, 0)!);
    (req as AuthedRequest).auditDetail = `删除单页 #${req.params.id}`;
    ok(res, true, '页面已删除');
  }),
);

// ---------------- 站点设置 ----------------
router.get(
  '/settings',
  handler(async (_req, res) => {
    ok(res, service.settings());
  }),
);

router.put(
  '/settings',
  handler(async (req, res) => {
    const input = service.settingSchema.parse(req.body ?? {});
    (req as AuthedRequest).auditDetail = `更新站点设置 ${input.items.length} 项`;
    ok(res, service.updateSettings(input), '站点设置已保存');
  }),
);

export default router;
