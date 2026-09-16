# 停止本程序正在运行的服务（安装、升级、卸载前调用）
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\stop-service.ps1
#
# 只结束「可执行文件位于本程序目录下」的进程，不会影响其它程序；
# 若端口被其它程序占用，仅提示，不强制结束。
param(
  [int]$Port = 0,
  # 检查模式：处理完后若端口仍被占用则以退出码 1 结束（供启动脚本判断）
  [switch]$CheckOnly
)

$ErrorActionPreference = 'SilentlyContinue'
$root = Split-Path -Parent $PSScriptRoot

if (-not $Port) {
  $envFile = Join-Path $root '.env'
  if (Test-Path $envFile) {
    $line = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1
    if ($line) { $Port = [int](($line -split '=', 2)[1]).Trim() }
  }
  if (-not $Port) { $Port = 8000 }
}

$conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conn) {
  if (-not $CheckOnly) { Write-Host "端口 $Port 空闲，无需处理" }
  exit 0
}

# 注意：$PID 是 PowerShell 的只读自动变量，这里必须换名，否则整个循环会静默失败
foreach ($procId in ($conn.OwningProcess | Select-Object -Unique)) {
  $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
  if (-not $proc) { continue }

  $procPath = $null
  try { $procPath = $proc.Path } catch { $procPath = $null }

  if ($procPath -and $procPath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
    Write-Host "正在停止本程序的服务：$procPath (PID $procId)"
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 300
    if (-not (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
      Write-Host "服务已停止"
    } else {
      Write-Host "服务未能自动停止，请手动关闭本程序的命令行窗口"
    }
  } else {
    Write-Host "端口 $Port 被其它程序占用：$procPath (PID $procId)"
    Write-Host "如需更换端口，请用记事本修改 $root\.env 中的 PORT 后重新启动。"
  }
}

Start-Sleep -Milliseconds 500

if ($CheckOnly) {
  $still = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($still) { exit 1 }
}
