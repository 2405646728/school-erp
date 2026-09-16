/**
 * 建表脚本：
 *   pnpm db:migrate          仅建表（幂等）
 *   pnpm db:reset            删表重建 + 重新灌入演示数据
 */
import { db, readSchemaSql } from './index';

const TABLES = [
  'sys_log',
  'sys_setting',
  'sys_user',
  'enrollment',
  'course_offering',
  'course',
  'student',
  'class_group',
  'teacher',
  'major',
  'department',
  'cms_banner',
  'cms_article',
  'cms_page',
  'cms_setting',
];

export function migrate(options: { reset?: boolean } = {}) {
  if (options.reset) {
    console.log('[migrate] 正在清空原有数据表 ...');
    for (const table of TABLES) {
      db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
  }
  db.exec(readSchemaSql());
  if (!options.reset) console.log('[migrate] 数据表已就绪');
}

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  migrate({ reset });
  if (reset) {
    // 延迟加载，确保删表后才写入种子数据
    const { seed } = require('./seed') as typeof import('./seed');
    const { seedCms } = require('./seed-cms') as typeof import('./seed-cms');
    seed();
    seedCms();
  }
  console.log('[migrate] 完成');
}
