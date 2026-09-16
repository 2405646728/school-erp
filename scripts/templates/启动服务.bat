@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title 高校学生管理系统 - 服务运行中

echo.
echo   ==================================================
echo      高校学生管理系统   一键启动
echo   ==================================================
echo.

rem ---------- 1. 准备 Node 运行时 ----------
set "NODE_EXE="
set "NODE_SOURCE="

if exist "node\node.exe" (
  set "NODE_EXE=%~dp0node\node.exe"
  set "NODE_SOURCE=包内自带运行时"
) else (
  where node >nul 2>nul
  if !errorlevel! equ 0 (
    for /f "delims=" %%v in ('node -e "process.stdout.write(String(process.versions.node.split('.')[0]))" 2^>nul') do set "NODE_MAJOR=%%v"
    if defined NODE_MAJOR (
      if !NODE_MAJOR! GEQ 22 (
        set "NODE_EXE=node"
        set "NODE_SOURCE=系统已安装的 Node.js"
      )
    )
  )
)

if not defined NODE_EXE (
  echo   [1/2] 未检测到可用的 Node.js，正在自动下载便携运行时（约 30MB）...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "tools\install-node.ps1"
  if exist "node\node.exe" (
    set "NODE_EXE=%~dp0node\node.exe"
    set "NODE_SOURCE=刚下载的运行时"
  )
)

if not defined NODE_EXE (
  echo.
  echo   [错误] 无法准备 Node 运行时，服务未能启动。
  echo.
  echo   可以手动安装 Node.js 22 以上版本后重新运行本脚本：
  echo   https://nodejs.org/zh-cn/download
  echo.
  pause
  exit /b 1
)

echo   [1/3] 运行环境就绪（!NODE_SOURCE!）

echo   [2/3] 检查端口占用情况 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\stop-service.ps1" -CheckOnly >nul 2>nul
if !errorlevel! equ 1 (
  echo.
  echo   [提示] 配置的端口已被其它程序占用，服务无法启动。
  echo.
  echo   请用记事本打开本目录下的 .env 文件，把 PORT=8000 改成
  echo   其它端口（例如 8080）后重新启动本脚本。
  echo.
  pause
  exit /b 1
)

echo   [3/3] 正在启动服务，首次启动会自动建库并写入演示数据 ...
echo.

rem 服务日志为 UTF-8，切换控制台代码页避免中文乱码
chcp 65001 >nul

set "NODE_ENV=production"
set "OPEN_BROWSER=true"

"!NODE_EXE!" "server\dist\server.js"
set "EXIT_CODE=!errorlevel!"

chcp 936 >nul

echo.
if not "!EXIT_CODE!"=="0" (
  echo   [提示] 服务已退出，错误码 !EXIT_CODE!。
  echo   如果提示端口被占用，请用记事本打开本目录下的 .env 文件，
  echo   把 PORT=8000 改成其它端口（例如 8080）后重新启动。
) else (
  echo   服务已停止。
)
echo.
pause
