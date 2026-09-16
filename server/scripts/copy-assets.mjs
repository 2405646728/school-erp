/** 构建后把 SQL 等非 TS 资源复制到 dist，保证 node dist/server.js 可直接运行 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = [['src/db/schema.sql', 'dist/db/schema.sql']];

for (const [from, to] of assets) {
  const source = path.join(root, from);
  const target = path.join(root, to);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`[copy-assets] ${from} -> ${to}`);
}
