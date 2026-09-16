#!/usr/bin/env bash
# 自动下载并解压便携 Node 运行时到 <包根目录>/node（Linux / macOS）
set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
TARGET="$ROOT/node"

step() { echo "        $1"; }

# ---------- 1. 版本 ----------
VERSION=""
if command -v curl >/dev/null 2>&1; then
  VERSION="$(curl -fsSL --max-time 20 https://nodejs.org/dist/index.json 2>/dev/null \
    | tr '}' '\n' | grep -m1 '"lts":"' | sed -n 's/.*"version":"v\([0-9.]*\)".*/\1/p' || true)"
fi
[ -z "$VERSION" ] && VERSION="22.20.0"

# ---------- 2. 平台 ----------
OS="linux"
case "$(uname -s)" in
  Darwin) OS="darwin" ;;
  Linux)  OS="linux" ;;
esac
ARCH="x64"
case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64)  ARCH="x64" ;;
esac

FILE="node-v$VERSION-$OS-$ARCH.tar.gz"
step "准备 Node.js v$VERSION ($OS-$ARCH)"

CACHE="$ROOT/tools/.cache"
mkdir -p "$CACHE"

URLS=(
  "https://nodejs.org/dist/v$VERSION/$FILE"
  "https://npmmirror.com/mirrors/node/v$VERSION/$FILE"
  "https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/v$VERSION/$FILE"
)

# ---------- 3. 下载 ----------
if [ ! -f "$CACHE/$FILE" ]; then
  ok=0
  for url in "${URLS[@]}"; do
    step "下载 $url"
    if command -v curl >/dev/null 2>&1; then
      curl -fL --connect-timeout 15 -o "$CACHE/$FILE" "$url" && ok=1 && break
    elif command -v wget >/dev/null 2>&1; then
      wget -q -T 30 -O "$CACHE/$FILE" "$url" && ok=1 && break
    fi
    step "该源不可用，尝试下一个 ..."
  done
  if [ "$ok" != "1" ]; then
    echo "        [错误] 所有下载源均不可用，请检查网络或手动安装 Node.js。" >&2
    exit 1
  fi
fi

# ---------- 4. 解压 ----------
step "正在解压 ..."
rm -rf "$CACHE/extract"
mkdir -p "$CACHE/extract"
tar -xzf "$CACHE/$FILE" -C "$CACHE/extract"

INNER="$(find "$CACHE/extract" -maxdepth 1 -type d -name 'node-v*' | head -1)"
[ -z "$INNER" ] && { echo "        [错误] 解压结果异常" >&2; exit 1; }

rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -R "$INNER/bin" "$TARGET/bin"
[ -d "$INNER/lib" ] && cp -R "$INNER/lib" "$TARGET/lib"

step "运行时已就绪：node/bin/node"
rm -rf "$CACHE/extract"
