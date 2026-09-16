/**
 * 一键打包脚本
 *   node scripts/package.mjs                 打包 Windows x64 绿色部署包（含内置 Node 运行时）
 *   node scripts/package.mjs --no-node       打包纯净版（依赖目标机器已装 Node）
 *   node scripts/package.mjs --platform linux-x64
 *   node scripts/package.mjs --skip-build    复用已有构建产物，仅重新组装
 *
 * 产物：release/school-erp-<version>-<platform>/ 以及同名 .zip
 *
 * 目标机器无需安装任何环境：包内自带 Node 运行时与生产依赖，解压后双击启动脚本即可。
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const getOption = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const platform = getOption('--platform', process.platform === 'win32' ? 'win-x64' : `${process.platform}-${process.arch}`);
const withNode = !hasFlag('--no-node');
const skipBuild = hasFlag('--skip-build');

const releaseRoot = path.join(root, 'release');
const targetName = `school-erp-${version}-${platform}`;
const target = path.join(releaseRoot, targetName);

// 运行时依赖（与 server/package.json 保持一致，打包时只装这些）
const RUNTIME_DEPS = {
  bcryptjs: '^2.4.3',
  compression: '^1.7.5',
  cors: '^2.8.5',
  dayjs: '^1.11.13',
  dotenv: '^16.4.7',
  express: '^4.21.2',
  jsonwebtoken: '^9.0.2',
  zod: '^3.24.1',
};

function log(step, message) {
  console.log(`\n[${step}] ${message}`);
}

function copyDir(from, to, filter) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (filter && !filter(entry)) continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest, filter);
    else fs.copyFileSync(src, dest);
  }
}

function run(command, cwd = root, env = {}) {
  console.log(`  $ ${command}`);
  execSync(command, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}

async function download(url, dest) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`下载失败 ${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return buffer.length;
}

/** 获取 Node 官方当前 LTS 版本号 */
async function resolveNodeVersion() {
  try {
    const response = await fetch('https://nodejs.org/dist/index.json');
    const list = await response.json();
    const lts = list.find((item) => item.lts);
    if (lts?.version) return lts.version.replace(/^v/, '');
  } catch {
    /* 网络不可用时回落到固定版本 */
  }
  return '22.20.0';
}

/** 下载并解压便携 Node 运行时到 <target>/node */
async function bundleNodeRuntime() {
  const nodeVersion = await resolveNodeVersion();
  log('node', `准备内置 Node 运行时 v${nodeVersion} (${platform})`);

  const isWin = platform.startsWith('win');
  const fileName = isWin ? `node-v${nodeVersion}-${platform}.zip` : `node-v${nodeVersion}-${platform}.tar.gz`;
  const urls = [
    `https://nodejs.org/dist/v${nodeVersion}/${fileName}`,
    `https://npmmirror.com/mirrors/node/v${nodeVersion}/${fileName}`,
  ];

  const cacheDir = path.join(releaseRoot, '.cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const archive = path.join(cacheDir, fileName);

  if (!fs.existsSync(archive)) {
    let lastError;
    for (const url of urls) {
      try {
        const size = await download(url, archive);
        console.log(`  ✓ 已下载 ${(size / 1024 / 1024).toFixed(1)} MB  ${url}`);
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        console.log(`  ! 镜像不可用：${url}`);
      }
    }
    if (lastError) throw new Error(`Node 运行时下载失败：${lastError.message}`);
  } else {
    console.log('  ✓ 使用已缓存的安装包');
  }

  const extractDir = path.join(cacheDir, 'extract');
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  if (isWin) {
    execFileSync(
      'powershell',
      ['-NoProfile', '-Command', `Expand-Archive -Path "${archive}" -DestinationPath "${extractDir}" -Force`],
      { stdio: 'inherit' },
    );
  } else {
    run(`tar -xzf "${archive}" -C "${extractDir}"`);
  }

  const inner = fs.readdirSync(extractDir).find((name) => name.startsWith('node-v'));
  if (!inner) throw new Error('解压后未找到 Node 目录');

  const nodeDir = path.join(target, 'node');
  fs.mkdirSync(nodeDir, { recursive: true });
  const innerPath = path.join(extractDir, inner);

  if (isWin) {
    fs.copyFileSync(path.join(innerPath, 'node.exe'), path.join(nodeDir, 'node.exe'));
  } else {
    copyDir(path.join(innerPath, 'bin'), path.join(nodeDir, 'bin'));
    copyDir(path.join(innerPath, 'lib'), path.join(nodeDir, 'lib'));
  }

  const size = (() => {
    let total = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else total += fs.statSync(full).size;
      }
    };
    walk(nodeDir);
    return (total / 1024 / 1024).toFixed(0);
  })();
  console.log(`  ✓ 运行时已内置（${size} MB）`);
}

async function main() {
  console.log('════════════════════════════════════════════');
  console.log(`  打包高校学生管理系统 · v${version} · ${platform}`);
  console.log(`  内置 Node 运行时：${withNode ? '是' : '否'}`);
  console.log('════════════════════════════════════════════');

  // 1) 构建前端与后端
  if (!skipBuild) {
    log('build', '构建后端 (tsc)');
    run('pnpm -C server build');

    // 一键部署时两个前端同源：官网在 /，后台在 /admin
    log('build', '构建管理后台（挂载于 /admin）');
    run('npx vite build --base=/admin/', path.join(root, 'web'), { VITE_SITE_URL: '/' });

    log('build', '构建学校官网（挂载于 /）');
    run('npx vite build --base=/', path.join(root, 'site'), { VITE_ADMIN_URL: '/admin' });
  } else {
    log('build', '跳过构建，复用已有产物');
  }

  // 2) 组装目录
  log('pack', `组装到 release/${targetName}`);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });

  copyDir(path.join(root, 'server/dist'), path.join(target, 'server/dist'));
  // 静态资源与后端约定一致：server/public/{admin,site}
  copyDir(path.join(root, 'web/dist'), path.join(target, 'server/public/admin'));
  copyDir(path.join(root, 'site/dist'), path.join(target, 'server/public/site'));
  fs.mkdirSync(path.join(target, 'data'), { recursive: true });
  fs.mkdirSync(path.join(target, 'tools'), { recursive: true });

  // 精简后的后端 package.json（不含 devDependencies 与工作区字段）
  fs.writeFileSync(
    path.join(target, 'server/package.json'),
    `${JSON.stringify(
      {
        name: 'school-erp-server',
        version,
        private: true,
        description: '高校学生管理系统 后端服务',
        main: 'dist/server.js',
        scripts: { start: 'node dist/server.js' },
        dependencies: RUNTIME_DEPS,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  fs.writeFileSync(
    path.join(target, '.env'),
    [
      '# 服务端口（被占用时可改成 8001、9000 等）',
      'PORT=8000',
      'NODE_ENV=production',
      '',
      '# JWT 密钥：正式使用时请改成自己的随机字符串',
      'JWT_SECRET=school-erp-production-secret-change-me',
      'JWT_EXPIRES_IN=12h',
      '',
      '# SQLite 数据文件位置（相对 server 目录）',
      'DB_FILE=../data/school-erp.db',
      '',
      '# 前端静态资源目录（相对 server 目录，一般无需修改）',
      'PUBLIC_DIR=./public',
      '',
      '# 启动后自动打开浏览器',
      'OPEN_BROWSER=true',
      '',
    ].join('\n'),
    'utf8',
  );

  // 3) 安装生产依赖（打包机上执行，目标机器无需联网）
  log('deps', '安装生产依赖到包内');
  run('npm install --omit=dev --no-audit --no-fund --loglevel=error', path.join(target, 'server'));

  // 4) 启动脚本与说明
  log('pack', '写入启动脚本与使用说明');
  const templates = path.join(root, 'scripts/templates');
  fs.copyFileSync(path.join(templates, '启动服务.bat'), path.join(target, '启动服务.bat'));
  fs.copyFileSync(path.join(templates, 'start.sh'), path.join(target, 'start.sh'));
  fs.copyFileSync(path.join(templates, '使用说明.txt'), path.join(target, '使用说明.txt'));
  fs.copyFileSync(path.join(templates, 'install-node.ps1'), path.join(target, 'tools/install-node.ps1'));
  fs.copyFileSync(path.join(templates, 'install-node.sh'), path.join(target, 'tools/install-node.sh'));
  fs.copyFileSync(path.join(templates, 'stop-service.ps1'), path.join(target, 'tools/stop-service.ps1'));
  try {
    fs.chmodSync(path.join(target, 'start.sh'), 0o755);
    fs.chmodSync(path.join(target, 'tools/install-node.sh'), 0o755);
  } catch {
    /* Windows 上忽略 */
  }

  // 4.5) 编码适配（Windows 专有）
  //   .bat 必须为 GBK，否则 cmd 会按 ANSI 解析中文导致 if 语句块被拆散
  //   .ps1 必须带 UTF-8 BOM，否则 PowerShell 5.1 会把中文当 ANSI
  if (process.platform === 'win32') {
    const conversions = [
      { file: '启动服务.bat', encoding: 'gbk' },
      { file: 'tools/install-node.ps1', encoding: 'utf8bom' },
      { file: 'tools/stop-service.ps1', encoding: 'utf8bom' },
      { file: '使用说明.txt', encoding: 'utf8bom' },
    ];
    for (const item of conversions) {
      const target_file = path.join(target, item.file);
      execFileSync('powershell', [
        '-NoProfile',
        '-Command',
        `$p = '${target_file.replace(/'/g, "''")}';` +
          `$text = [IO.File]::ReadAllText($p, [Text.Encoding]::UTF8);` +
          (item.encoding === 'gbk'
            ? `[IO.File]::WriteAllText($p, $text, [Text.Encoding]::GetEncoding(936));`
            : `[IO.File]::WriteAllText($p, $text, (New-Object Text.UTF8Encoding $true));`),
      ]);
      console.log(`  ✓ ${item.file} → ${item.encoding === 'gbk' ? 'GBK' : 'UTF-8 BOM'}`);
    }
  }

  // 5) 内置 Node 运行时
  if (withNode) {
    await bundleNodeRuntime();
  } else {
    fs.writeFileSync(
      path.join(target, 'node/.keep'),
      '此版本未内置 Node 运行时，启动脚本会自动下载，或请先安装 Node.js 22 以上版本。\n',
      'utf8',
    );
  }

  // 5.5) 自检：静态资源与控制台首页必须存在，否则目标机器打开会是空白
  log('check', '校验产物完整性');
  const required = [
    'server/dist/server.js',
    'server/dist/db/schema.sql',
    'server/public/admin/index.html',
    'server/public/site/index.html',
    '启动服务.bat',
    'start.sh',
    '使用说明.txt',
    'tools/install-node.ps1',
    '.env',
  ];
  const missing = required.filter((item) => !fs.existsSync(path.join(target, item)));
  if (missing.length) {
    throw new Error(`产物缺少必要文件：${missing.join('、')}`);
  }
  console.log(`  ✓ ${required.length} 项关键文件齐备`);

  // 用包内运行时真实解析一次配置，确认静态目录指向正确（避免编译产物与源码不一致）
  const nodeExe = process.platform === 'win32' ? path.join(target, 'node/node.exe') : null;
  if (nodeExe && fs.existsSync(nodeExe)) {
    const probe = execFileSync(
      nodeExe,
      [
        '-e',
        "const{config}=require(process.argv[1]);const fs=require('fs');const p=require('path');" +
          "const ok=fs.existsSync(p.join(config.publicDir,'admin','index.html'))&&fs.existsSync(p.join(config.publicDir,'site','index.html'));" +
          "process.stdout.write(JSON.stringify({publicDir:config.publicDir,ok}))",
        path.join(target, 'server/dist/config'),
      ],
      { cwd: path.join(target, 'server'), encoding: 'utf8' },
    );
    const result = JSON.parse(probe);
    if (!result.ok) {
      throw new Error(`静态资源路径校验失败：解析到 ${result.publicDir}，其中缺少 admin/site 首页`);
    }
    console.log(`  ✓ 运行时路径校验通过（publicDir = ${path.relative(target, result.publicDir)}）`);
  }

  // 6) 统计与压缩
  const stats = { files: 0, bytes: 0 };
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        stats.files += 1;
        stats.bytes += fs.statSync(full).size;
      }
    }
  };
  walk(target);
  log('pack', `目录就绪：${stats.files} 个文件，${(stats.bytes / 1024 / 1024).toFixed(1)} MB`);

  log('zip', '压缩为 zip');
  const zipPath = path.join(releaseRoot, `${targetName}.zip`);
  fs.rmSync(zipPath, { force: true });
  if (process.platform === 'win32') {
    execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path "${path.join(target, '*')}" -DestinationPath "${zipPath}" -CompressionLevel Optimal`,
      ],
      { stdio: 'inherit' },
    );
  } else {
    run(`zip -qr "${zipPath}" .`, target);
  }
  const zipSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
  console.log(`  ✓ ${path.relative(root, zipPath)}（${zipSize} MB）`);

  console.log('\n════════════════════════════════════════════');
  console.log('  打包完成');
  console.log('════════════════════════════════════════════');
  console.log(`  目录：${path.relative(root, target)}`);
  console.log(`  压缩包：${path.relative(root, zipPath)}`);
  console.log('');
  console.log('  目标机器使用方法：解压后双击「启动服务.bat」（Linux/macOS 执行 ./start.sh）');
  console.log('  首次启动会自动建库并写入演示数据，随后浏览器自动打开官网首页。');
  console.log('');
}

main().catch((error) => {
  console.error('\n打包失败：', error.message);
  process.exit(1);
});
