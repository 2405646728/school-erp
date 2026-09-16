import { Router } from 'express';
import { ApiError, handler, ok } from '../../utils/http';
import { num } from '../../utils/query';
import * as service from './public.service';

/** 官网公开接口：挂载在 /api/public，全部无需登录 */
const router = Router();

router.get(
  '/site',
  handler(async (_req, res) => {
    ok(res, service.siteInfo());
  }),
);

router.get(
  '/banners',
  handler(async (_req, res) => {
    ok(res, service.banners());
  }),
);

router.get(
  '/headline',
  handler(async (_req, res) => {
    ok(res, service.headline());
  }),
);

router.get(
  '/articles',
  handler(async (req, res) => {
    ok(res, service.articles(req));
  }),
);

router.get(
  '/articles/:id',
  handler(async (req, res) => {
    const detail = service.articleDetail(num(req.params.id, 0)!);
    if (!detail) throw ApiError.notFound('文章不存在或已下线');
    ok(res, detail);
  }),
);

router.get(
  '/pages/:slug',
  handler(async (req, res) => {
    const detail = service.pageDetail(String(req.params.slug));
    if (!detail) throw ApiError.notFound('页面不存在或已下线');
    ok(res, detail);
  }),
);

router.get(
  '/departments',
  handler(async (_req, res) => {
    ok(res, service.departments());
  }),
);

router.get(
  '/teachers',
  handler(async (req, res) => {
    ok(res, service.teachers(req));
  }),
);

router.get(
  '/courses',
  handler(async (req, res) => {
    ok(res, service.courses(req));
  }),
);

router.get(
  '/search',
  handler(async (req, res) => {
    ok(res, service.search(req));
  }),
);

export default router;
