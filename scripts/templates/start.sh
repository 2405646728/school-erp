#!/usr/bin/env bash
# 高校学生管理系统 · 一键启动（Linux / macOS）
set -e
cd "$(dirname "$0")"

echo ""
echo "  =================================================="
echo "     高校学生管理系统   一键启动"
echo "  =================================================="
echo ""

# ---------- 1. 准备 Node 运行时 ----------
NODE_BIN=""
NODE_SOURCE=""

if [ -x "./node/bin/node" ]; then
  NODE_BIN="./node/bin/node"
  NODE_SOURCE="包内自带运行时"
elif command -v node >/dev/null 2>&1; then
  MAJOR="$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))' 2>/dev/null || echo 0)"
  if [ "$MAJOR" -ge 22 ]; then
    NODE_BIN="node"
    NODE_SOURCE="系统已安装的 Node.js"
  fi
fi

if [ -z "$NODE_BIN" ]; then
  echo "  [1/2] 未检测到可用的 Node.js，正在自动下载便携运行时（约 30MB）..."
  echo ""
  bash tools/install-node.sh || true
  if [ -x "./node/bin/node" ]; then
    NODE_BIN="./node/bin/node"
    NODE_SOURCE="刚下载的运行时"
  fi
fi

if [ -z "$NODE_BIN" ]; then
  echo ""
  echo "  [错误] 无法准备 Node 运行时，服务未能启动。"
  echo "  可手动安装 Node.js 22 以上版本后重新运行：https://nodejs.org/zh-cn/download"
  echo ""
  exit 1
fi

echo "  [1/3] 运行环境就绪（$NODE_SOURCE）"
echo "  [2/3] 检查端口占用情况 ..."
if command -v powershell >/dev/null 2>&1; then
  powershell -NoProfile -ExecutionPolicy Bypass -File tools/stop-service.ps1 -CheckOnly >/dev/null 2>&1
elif command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File tools/stop-service.ps1 -CheckOnly >/dev/null 2>&1
fi
echo "  [3/3] 正在启动服务，首次启动会自动建库并写入演示数据 ..."
echo ""

export NODE_ENV=production
export OPEN_BROWSER=true

exec "$NODE_BIN" server/dist/server.js
