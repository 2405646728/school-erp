# 自动下载并解压便携 Node 运行时到 <包根目录>/node
# 由「启动服务.bat」在未检测到 Node.js 时调用，也可单独执行：
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\install-node.ps1
param(
  [string]$Version = "",
  [string]$Mirror  = "",
  [string]$TargetDir = "",
  # 源码部署需要 npm / corepack，使用 -Full 保留完整发行包
  [switch]$Full
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
if (-not $TargetDir) { $TargetDir = Join-Path $Root "node" }

function Write-Step($msg) { Write-Host "        $msg" }

# ---------- 1. 确定版本 ----------
if (-not $Version) {
  Write-Step "正在查询 Node.js 当前 LTS 版本 ..."
  try {
    $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -TimeoutSec 20 -UseBasicParsing
    $lts = $index | Where-Object { $_.lts } | Select-Object -First 1
    if ($lts) { $Version = $lts.version.TrimStart("v") }
  } catch {
    Write-Step "查询失败，使用内置默认版本"
  }
  if (-not $Version) { $Version = "22.20.0" }
}

# ---------- 2. 确定架构 ----------
$arch = switch ($env:PROCESSOR_ARCHITECTURE) {
  "ARM64" { "arm64" }
  "x86"   { "x86" }
  default { "x64" }
}
$file = "node-v$Version-win-$arch.zip"
Write-Step "准备 Node.js v$Version (win-$arch)"

# ---------- 3. 下载（官方源失败自动切国内镜像） ----------
$cacheDir = Join-Path $Root "tools\.cache"
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
$zip = Join-Path $cacheDir $file

$urls = @()
if ($Mirror) { $urls += "$Mirror/v$Version/$file" }
$urls += "https://nodejs.org/dist/v$Version/$file"
$urls += "https://npmmirror.com/mirrors/node/v$Version/$file"
$urls += "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v$Version/$file"

if (-not (Test-Path $zip)) {
  $ok = $false
  foreach ($url in $urls) {
    try {
      Write-Step "下载 $url"
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      Invoke-WebRequest -Uri $url -OutFile $zip -TimeoutSec 300 -UseBasicParsing
      $ok = $true
      Write-Step "下载完成"
      break
    } catch {
      Write-Step "该源不可用，尝试下一个 ..."
    }
  }
  if (-not $ok) {
    Write-Host ""
    Write-Host "        [错误] 所有下载源均不可用，请检查网络或手动安装 Node.js。" -ForegroundColor Red
    exit 1
  }
}

# ---------- 4. 解压，只保留 node.exe ----------
Write-Step "正在解压 ..."
$extractDir = Join-Path $cacheDir "extract"
if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $extractDir -Force

$inner = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
if (-not $inner) {
  Write-Host "        [错误] 解压结果异常" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null

if ($Full) {
  Copy-Item (Join-Path $inner.FullName "*") $TargetDir -Recurse -Force
  Write-Step "完整运行时已就绪（含 npm / corepack）：$TargetDir"
} else {
  Copy-Item (Join-Path $inner.FullName "node.exe") (Join-Path $TargetDir "node.exe") -Force
  $size = [math]::Round((Get-Item (Join-Path $TargetDir "node.exe")).Length / 1MB, 0)
  Write-Step "运行时已就绪：$TargetDir\node.exe（$size MB）"
}

Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
