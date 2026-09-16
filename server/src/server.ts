import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from './app';
import { config } from './config';
import { db, scalar } from './db';
import { migrate } from './db/migrate';
import { seed } from './db/seed';
import { seedCms } from './db/seed-cms';

/** 打开系统默认浏览器（一键部署启动时使用） */
function openBrowser(url: string) {
  const platform = process.platform;
  const command =
    platform === 'win32' ? `start "" "${url}"` : platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(command, () => {
    /* 打不开也不影响服务运行 */
  });
}

function bootstrap() {
  // 首次启动自动建表；空库自动灌入演示数据，保证解压即用
  migrate();
  if (scalar<number>(`SELECT COUNT(*) FROM student`) === 0) {
    console.log('[bootstrap] 检测到空数据库，正在写入演示数据 ...');
    seed();
  }
  if (scalar<number>(`SELECT COUNT(*) FROM cms_article`) === 0) {
    console.log('[bootstrap] 正在写入官网演示内容 ...');
    seedCms();
  }

  const hasAdmin = fs.existsSync(path.join(config.publicDir, 'admin'));
  const hasSite = fs.existsSync(path.join(config.publicDir, 'site'));

  const app = createApp();
  const server = app.listen(config.port, () => {
    const base = `http://localhost:${config.port}`;
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════╗');
    console.log('  ║        高校学生管理系统 · 已启动                 ║');
    console.log('  ╚══════════════════════════════════════════════════╝');
    console.log('');
    if (hasSite) console.log(`  ➜  学校官网    ${base}/`);
    if (hasAdmin) console.log(`  ➜  管理后台    ${base}/admin`);
    console.log(`  ➜  接口索引    ${base}/api`);
    console.log(`  ➜  健康检查    ${base}/api/health`);
    console.log('');
    console.log(`  ➜  数据文件    ${config.dbFile}`);
    console.log(`  ➜  运行环境    ${config.env}`);
    console.log('');
    console.log('  演示账号：admin / admin123（管理员）');
    console.log('            T0001 / 123456（教师）');
    console.log('            2024080901001 / 123456（学生）');
    console.log('');
    console.log('  关闭此窗口即停止服务。');
    console.log('');

    if (config.openBrowser) {
      setTimeout(() => openBrowser(hasSite ? `${base}/` : `${base}/api`), 800);
    }
  });

  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] 正在关闭服务 ...`);
    server.close(() => {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
