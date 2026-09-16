import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// 依次尝试：源码模式的 server/.env、一键部署包根目录的 .env
for (const candidate of [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
]) {
  if (fs.existsSync(candidate)) dotenv.config({ path: candidate });
}

const rootDir = path.resolve(__dirname, '../..');

export const config = {
  /** 服务监听端口 */
  port: Number(process.env.PORT || 8000),
  env: process.env.NODE_ENV || 'development',
  /** 服务版本号，前端侧边栏底部会展示 */
  version: '0.1.0',
  appName: '学生管理系统',

  jwt: {
    secret: process.env.JWT_SECRET || 'school-erp-dev-secret-please-change',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },

  /** SQLite 数据文件绝对路径 */
  dbFile: path.resolve(rootDir, process.env.DB_FILE || 'data/school-erp.db'),

  /** 前端静态资源目录：存在时由后端直接托管官网与后台（生产/一键部署模式） */
  publicDir: process.env.PUBLIC_DIR
    ? path.resolve(rootDir, process.env.PUBLIC_DIR)
    : path.resolve(rootDir, 'public'),

  /** 启动后自动打开浏览器（一键部署脚本会开启） */
  openBrowser: process.env.OPEN_BROWSER === 'true',

  /** 是否输出 SQL 调试日志 */
  sqlDebug: process.env.SQL_DEBUG === 'true',
};
