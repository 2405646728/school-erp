/**
 * 生成 Windows 安装程序（.exe）
 *   node scripts/make-installer.mjs
 *   node scripts/make-installer.mjs --rebuild    先重新打包绿色版再制作安装程序
 *
 * 流程：准备免安装版产物 → 组装安装载荷（不含数据）→ 生成图标 →
 *      获取 NSIS 编译器（缺失时自动下载）→ 渲染并编译 .nsi → 输出 setup.exe
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const appName = '高校学生管理系统';
const publisher = '启明大学';
const port = '8000';
const platform = 'win-x64';

const portableDir = path.join(root, 'release', `school-erp-${version}-${platform}`);
const buildDir = path.join(root, 'build');
const payloadDir = path.join(buildDir, 'installer-payload');
const iconFile = path.join(buildDir, 'icon.ico');
const nsifFile = path.join(buildDir, 'installer.nsi');
const outFile = path.join(root, 'release', `school-erp-${version}-setup.exe`);
const nsisCache = path.join(root, 'tools', 'nsis-cache');

const NSIS_URLS = [
  'https://sourceforge.net/projects/nsis/files/NSIS%203/3.10/nsis-3.10.zip/download',
  'https://npmmirror.com/mirrors/nsis/nsis-3.10.zip',
];

const log = (msg) => console.log(msg);

function copyDir(from, to, skip = []) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip.includes(entry.name)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest, skip);
    else fs.copyFileSync(src, dest);
  }
}

function dirSizeKb(dir) {
  let total = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += fs.statSync(full).size;
    }
  };
  walk(dir);
  return Math.round(total / 1024);
}

/** 查找可用的 makensis（PATH → 常见安装位置 → 本地缓存） */
function findMakensis() {
  const candidates = [
    path.join(nsisCache, 'nsis-3.10', 'makensis.exe'),
    'C:\\Program Files (x86)\\NSIS\\makensis.exe',
    'C:\\Program Files\\NSIS\\makensis.exe',
  ];
  for (const candidate of candidates) {
    if (candidate.includes('\\') && fs.existsSync(candidate)) return candidate;
  }
  try {
    const found = execFileSync('where', ['makensis'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    if (found && fs.existsSync(found)) return found;
  } catch {
    /* 未安装 */
  }
  return null;
}

/** 自动下载 NSIS 便携版 */
function ensureNsis() {
  const existing = findMakensis();
  if (existing) {
    log(`  ✓ 使用 NSIS：${existing}`);
    return existing;
  }

  log('  ! 未检测到 NSIS，正在自动下载便携版（约 2.4 MB）...');
  fs.mkdirSync(nsisCache, { recursive: true });
  const zipPath = path.join(nsisCache, 'nsis.zip');

  if (!fs.existsSync(zipPath)) {
    let downloaded = false;
    for (const url of NSIS_URLS) {
      try {
        log(`    下载 ${url}`);
        execFileSync('curl', ['-sL', '-m', '300', '-o', zipPath, url], { stdio: 'inherit' });
        if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 500000) {
          downloaded = true;
          break;
        }
      } catch {
        log('    该源不可用，尝试下一个 ...');
      }
    }
    if (!downloaded) throw new Error('NSIS 下载失败，请手动安装 NSIS 3 后重试：https://nsis.sourceforge.io/');
  }

  log('    正在解压 ...');
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Expand-Archive -Path "${zipPath}" -DestinationPath "${nsisCache}" -Force`],
    { stdio: 'inherit' },
  );

  const found = findMakensis();
  if (!found) throw new Error('NSIS 解压后未找到 makensis.exe');
  log(`  ✓ NSIS 就绪：${found}`);
  return found;
}

async function main() {
  log('');
  log('════════════════════════════════════════════════');
  log(`  制作 Windows 安装程序 · ${appName} v${version}`);
  log('════════════════════════════════════════════════');

  // 1) 免安装版产物
  log('\n[1/5] 准备程序文件');
  if (hasFlag('--rebuild') || !fs.existsSync(path.join(portableDir, 'server/dist/server.js'))) {
    log('  未找到免安装版产物，先执行打包 ...');
    execFileSync(process.execPath, [path.join(root, 'scripts/package.mjs')], { stdio: 'inherit' });
  }
  log(`  ✓ 源目录：${path.relative(root, portableDir)}`);

  // 2) 组装安装载荷（剔除 data，避免把本机测试数据装给用户）
  log('\n[2/5] 组装安装载荷');
  fs.rmSync(payloadDir, { recursive: true, force: true });
  copyDir(portableDir, payloadDir, ['data']);
  fs.mkdirSync(path.join(payloadDir, 'data'), { recursive: true });
  log(`  ✓ 载荷已就绪（${(dirSizeKb(payloadDir) / 1024).toFixed(1)} MB，不含业务数据）`);

  // 3) 图标
  log('\n[3/5] 准备程序图标与向导图片');
  if (!fs.existsSync(iconFile)) {
    execFileSync(process.execPath, [path.join(root, 'scripts/make-assets.mjs')], { stdio: 'inherit' });
  }
  fs.copyFileSync(iconFile, path.join(payloadDir, 'icon.ico'));
  log('  ✓ 图标已随程序安装（用于快捷方式）');

  // 4) 渲染 NSIS 脚本
  log('\n[4/5] 生成安装脚本');
  const template = fs.readFileSync(path.join(root, 'scripts/templates/installer.nsi'), 'utf8');
  const rendered = template
    .replaceAll('__APP_NAME__', appName)
    .replaceAll('__APP_VERSION__', version)
    .replaceAll('__APP_PUBLISHER__', publisher)
    .replaceAll('__APP_PORT__', port)
    // 路径分隔符用 fromCharCode 生成，避免脚本源码里的反斜杠转义歧义（\t 会被当成制表符）
    .replaceAll('__SVC__', `${String.fromCharCode(92)}tools`)
    .replaceAll('__ICON_FILE__', iconFile)
    .replaceAll('__SIDE_IMAGE__', path.join(buildDir, 'wizard-side.bmp'))
    .replaceAll('__HEADER_IMAGE__', path.join(buildDir, 'wizard-header.bmp'))
    .replaceAll('__PAYLOAD_DIR__', payloadDir)
    .replaceAll('__OUT_FILE__', outFile)
    .replaceAll('__EST_SIZE_KB__', String(dirSizeKb(payloadDir)));
  // NSIS 3 支持 UTF-8 BOM 的脚本文件，中文才能正确编译
  fs.writeFileSync(nsifFile, `\ufeff${rendered}`, 'utf8');
  log(`  ✓ 已生成 ${path.relative(root, nsifFile)}`);

  // 5) 编译
  log('\n[5/5] 编译安装程序');
  const makensis = ensureNsis();
  fs.rmSync(outFile, { force: true });
  execFileSync(makensis, ['/V2', nsifFile], { stdio: 'inherit', cwd: buildDir });

  if (!fs.existsSync(outFile)) throw new Error('编译完成但未生成安装程序');
  const size = (fs.statSync(outFile).size / 1024 / 1024).toFixed(1);

  log('');
  log('════════════════════════════════════════════════');
  log('  安装程序制作完成');
  log('════════════════════════════════════════════════');
  log(`  文件：${path.relative(root, outFile)}（${size} MB）`);
  log('');
  log('  静默安装：school-erp-setup.exe /S /D=C:\\SchoolERP');
  log('  静默卸载：Uninstall.exe /S');
  log('');
}

main().catch((error) => {
  console.error('\n制作失败：', error.message);
  process.exit(1);
});
