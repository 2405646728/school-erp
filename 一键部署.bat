@echo off
cd /d "%~dp0"
title 高校学生管理系统 - 一键部署

echo.
echo   正在准备部署环境，请稍候 ...
echo   （首次运行会自动下载 Node 运行时并安装依赖，需要联网）
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\deploy.ps1" %*
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo   [错误] 部署未完成，错误码 %EXIT_CODE%。
  echo   常见原因：网络不可用导致依赖下载失败，或端口被占用。
  echo   如端口被占用，请编辑 server\.env 修改 PORT 后重试。
  echo.
  pause
)
