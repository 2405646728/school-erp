import fs from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middlewares/error';
import { operationLog } from './middlewares/operationLog';
import apiRoutes from './routes';

/**
 * 托管前端静态资源：
 *   /admin  → 管理后台（SPA，history 路由回退到 index.html）
 *   /       → 学校官网（SPA，其余路径回退到 index.html）
 * 仅在 public 目录存在时启用（即一键部署包 / 生产环境）。
 */
function mountStatic(app: Express) {
  const adminDir = path.join(config.publicDir, 'admin');
  const siteDir = path.join(config.publicDir, 'site');

  if (fs.existsSync(adminDir)) {
    app.use('/admin', express.static(adminDir, { index: false, maxAge: '7d' }));
    app.get(['/admin', '/admin/*'], (_req, res) => {
      res.sendFile(path.join(adminDir, 'index.html'));
    });
    console.log(`[static] 管理后台已托管于 /admin  (${adminDir})`);
  }

  if (fs.existsSync(siteDir)) {
    app.use(express.static(siteDir, { index: false, maxAge: '7d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(siteDir, 'index.html'));
    });
    console.log(`[static] 学校官网已托管于 /  (${siteDir})`);
  }
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 简易访问日志
  app.use((req, _res, next) => {
    if (config.sqlDebug) console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
    next();
  });

  app.use(operationLog);

  // 1) API 优先，未命中的接口路径返回 JSON 404（不会被前端回退吞掉）
  app.use('/api', apiRoutes);
  app.use('/api', (req, res) => {
    res.status(404).json({
      code: 404,
      message: `接口不存在：${req.method} ${req.originalUrl}`,
      data: null,
    });
  });

  // 2) 前端静态资源（存在时）
  mountStatic(app);

  // 3) 兜底（未托管前端时）
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
