# ============================================================
#  高校学生管理系统 · 源码一键部署（Windows）
#  自动完成：准备 Node 运行时 → 准备 pnpm → 安装依赖 → 构建 → 启动
#  目标电脑无需预装任何环境
# ============================================================
param(
  [switch]$SkipStart,
  [switch]$ResetDb
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Say($msg, $color = "Gray") { Write-Host $msg -ForegroundColor $color }
function Step($n, $msg) { Write-Host ""; Write-Host "[$n] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    !   $msg" -ForegroundColor Yellow }

$NodeDir = Join-Path $Root "node"
$NodeExe = Join-Path $NodeDir "node.exe"

Say ""
Say "==================================================" "DarkCyan"
Say "   高校学生管理系统 · 一键部署" "White"
Say "==================================================" "DarkCyan"

# ------------------------------------------------------------
Step "1/5" "检查 Node.js 运行时"
# ------------------------------------------------------------
if (-not (Test-Path $NodeExe)) {
  $systemNode = Get-Command node -ErrorAction SilentlyContinue
  $useSystem = $false
  if ($systemNode) {
    try {
      $major = [int](& node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
      if ($major -ge 22) { $useSystem = $true }
    } catch { $useSystem = $false }
  }

  if ($useSystem) {
    $NodeExe = "node"
    Ok "使用系统已安装的 Node.js（$(& node -v)）"
  } else {
    if ($systemNode) { Warn "系统 Node.js 版本过低（需要 22 以上），将下载便携运行时" }
    else { Warn "未检测到 Node.js，开始下载便携运行时（约 30MB，含 npm）" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "templates\install-node.ps1") -Full -TargetDir $NodeDir
    if (-not (Test-Path $NodeExe)) { throw "Node 运行时准备失败，请检查网络后重试" }
    Ok "便携运行时已就绪：node\node.exe"
  }
} else {
  Ok "使用项目内置运行时：node\node.exe"
}

$NodeDirAbsolute = if ($NodeExe -eq "node") { Split-Path (Get-Command node).Source } else { $NodeDir }

# ------------------------------------------------------------
Step "2/5" "检查 pnpm 包管理器"
# ------------------------------------------------------------
$pnpm = $null

$localPnpm = Join-Path $NodeDirAbsolute "pnpm.cmd"
if (Test-Path $localPnpm) {
  $pnpm = $localPnpm
  Ok "使用内置 pnpm"
} elseif (Get-Command pnpm -ErrorAction SilentlyContinue) {
  $pnpm = "pnpm"
  Ok "使用系统已安装的 pnpm（$(pnpm -v)）"
} else {
  Warn "未检测到 pnpm，正在安装 ..."
  $npm = Join-Path $NodeDirAbsolute "npm.cmd"
  if (-not (Test-Path $npm)) { $npm = "npm" }
  & $npm install -g pnpm --no-audit --no-fund --loglevel=error
  if (Test-Path $localPnpm) { $pnpm = $localPnpm } else { $pnpm = "pnpm" }
  Ok "pnpm 安装完成"
}

function Invoke-Pnpm([string[]]$pnpmArgs) {
  & $pnpm @pnpmArgs
  if ($LASTEXITCODE -ne 0) { throw "命令执行失败：pnpm $($pnpmArgs -join ' ')" }
}

# ------------------------------------------------------------
Step "3/5" "安装项目依赖"
# ------------------------------------------------------------
if (Test-Path (Join-Path $Root "node_modules\.pnpm")) {
  Ok "依赖已存在，跳过安装"
} else {
  Invoke-Pnpm @("install")
  Ok "依赖安装完成"
}

# ------------------------------------------------------------
Step "4/5" "构建前后端（后台挂载 /admin，官网挂载 /）"
# ------------------------------------------------------------
Invoke-Pnpm @("-C", "server", "build")
Ok "后端已编译"

Push-Location (Join-Path $Root "web")
$env:VITE_SITE_URL = "/"
& $pnpm exec vite build --base=/admin/
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "管理后台构建失败" }
Pop-Location
Ok "管理后台已构建"

Push-Location (Join-Path $Root "site")
$env:VITE_ADMIN_URL = "/admin"
& $pnpm exec vite build --base=/
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "学校官网构建失败" }
Pop-Location
Ok "学校官网已构建"

# 组装为后端可托管的静态目录
$publicDir = Join-Path $Root "server\public"
Remove-Item $publicDir -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path (Join-Path $publicDir "admin") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $publicDir "site") | Out-Null
Copy-Item (Join-Path $Root "web\dist\*") (Join-Path $publicDir "admin") -Recurse -Force
Copy-Item (Join-Path $Root "site\dist\*") (Join-Path $publicDir "site") -Recurse -Force
Ok "静态资源已就位：server\public\admin 与 server\public\site"

if ($ResetDb) {
  Warn "已指定 -ResetDb，正在重建数据库 ..."
  Invoke-Pnpm @("-C", "server", "db:reset")
  Ok "数据库已重建"
}

# ------------------------------------------------------------
Step "5/5" "启动服务"
# ------------------------------------------------------------
if ($SkipStart) {
  Ok "已跳过启动（-SkipStart）"
  Say ""
  Say "手动启动命令：" -ForegroundColor Gray
  Say "  cd server; `$env:NODE_ENV='production'; `$env:OPEN_BROWSER='true'; node dist/server.js" -ForegroundColor Gray
  exit 0
}

Say ""
Say "  学校官网    http://localhost:8000/" -ForegroundColor White
Say "  管理后台    http://localhost:8000/admin" -ForegroundColor White
Say "  管理员账号  admin / admin123" -ForegroundColor White
Say ""
Say "  首次启动会自动建库并写入演示数据。" -ForegroundColor Gray
Say "  关闭本窗口即停止服务。" -ForegroundColor Gray
Say ""

$env:NODE_ENV = "production"
$env:OPEN_BROWSER = "true"
Set-Location (Join-Path $Root "server")
& $NodeExe "dist\server.js"
