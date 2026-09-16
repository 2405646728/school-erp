; ============================================================
;  高校学生管理系统 · Windows 安装程序脚本（NSIS 3）
;  由 scripts/make-installer.mjs 渲染占位符后编译
; ============================================================
Unicode true

!include "MUI2.nsh"
!include "FileFunc.nsh"

!define APP_NAME "__APP_NAME__"
!define APP_VERSION "__APP_VERSION__"
!define APP_PUBLISHER "__APP_PUBLISHER__"
!define APP_PORT "__APP_PORT__"
!define APP_KEY "SchoolERP"
!define EST_SIZE_KB __EST_SIZE_KB__

Name "${APP_NAME} ${APP_VERSION}"
Caption "${APP_NAME} ${APP_VERSION} 安装向导"
BrandingText "${APP_NAME} · 内置运行环境"
OutFile "__OUT_FILE__"
InstallDir "$LOCALAPPDATA\Programs\${APP_KEY}"
InstallDirRegKey HKCU "Software\${APP_KEY}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32

VIProductVersion "__APP_VERSION__.0"
VIAddVersionKey /LANG=2052 "ProductName" "${APP_NAME}"
VIAddVersionKey /LANG=2052 "FileDescription" "${APP_NAME} 安装程序"
VIAddVersionKey /LANG=2052 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "ProductVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=2052 "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey /LANG=2052 "LegalCopyright" "${APP_PUBLISHER}"

Icon "__ICON_FILE__"
UninstallIcon "__ICON_FILE__"

; ---------------- 界面 ----------------
!define MUI_ABORTWARNING
!define MUI_ICON "__ICON_FILE__"
!define MUI_UNICON "__ICON_FILE__"

; 品牌化外观：左侧品牌图 + 页眉右侧徽标
!define MUI_WELCOMEFINISHPAGE_BITMAP "__SIDE_IMAGE__"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_RIGHT
!define MUI_HEADERIMAGE_BITMAP "__HEADER_IMAGE__"
!define MUI_HEADERIMAGE_BITMAP_NOSTRETCH

!define MUI_WELCOMEPAGE_TITLE "安装 __APP_NAME__"
!define MUI_WELCOMEPAGE_TEXT "本向导将把「__APP_NAME__ __APP_VERSION__」安装到您的电脑，全程约 1 分钟。$\r$\n$\r$\n【开箱即用】$\r$\n程序自带运行环境与数据库，目标电脑无需安装 Node.js、MySQL 等任何软件，也无需联网。$\r$\n$\r$\n【安装后即可访问】$\r$\n· 学校官网：http://localhost:${APP_PORT}/$\r$\n· 管理后台：http://localhost:${APP_PORT}/admin$\r$\n· 管理账号：admin / admin123$\r$\n$\r$\n点击「下一步」开始安装。"

!define MUI_FINISHPAGE_TITLE "安装完成"
!define MUI_FINISHPAGE_TEXT "__APP_NAME__ 已安装到：$\r$\n$INSTDIR$\r$\n$\r$\n学校官网：http://localhost:${APP_PORT}/$\r$\n管理后台：http://localhost:${APP_PORT}/admin$\r$\n默认管理员账号：admin / admin123$\r$\n$\r$\n关闭服务的命令行窗口即可停止运行。"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp
!define MUI_FINISHPAGE_RUN_TEXT "立即启动服务（浏览器会自动打开）"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\使用说明.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "打开使用说明"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "SimpChinese"

; ---------------- 工具函数 ----------------
; 结束占用服务端口的进程，避免升级/卸载时文件被占用
Function KillService
  DetailPrint "检查是否有本程序的服务正在运行 ..."
  IfFileExists "$INSTDIR__SVC__\stop-service.ps1" 0 done
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR__SVC__\stop-service.ps1"'
  Pop $0
  Sleep 600
  done:
FunctionEnd

Function LaunchApp
  ExecShell "open" "$INSTDIR\启动服务.bat"
FunctionEnd

; ---------------- 安装 ----------------
Section "主程序（必需）" SecMain
  SectionIn RO
  SetOutPath "$INSTDIR"
  SetOverwrite on

  Call KillService

  ; 程序本体（server / public / node / tools / 启动脚本 / 说明 / .env）
  File /r "__PAYLOAD_DIR__\*.*"

  ; 保留已有数据目录：若安装目录下已存在数据库则不覆盖
  CreateDirectory "$INSTDIR\data"

  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; 开始菜单
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\启动服务.lnk" "$INSTDIR\启动服务.bat" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\使用说明.lnk" "$INSTDIR\使用说明.txt" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icon.ico" 0

  ; 写入注册表（安装路径 + 控制面板卸载项）
  WriteRegStr HKCU "Software\${APP_KEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\${APP_KEY}" "Version" "${APP_VERSION}"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}" "EstimatedSize" ${EST_SIZE_KB}
SectionEnd

Section "创建桌面快捷方式" SecDesktop
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\启动服务.bat" "" "$INSTDIR\icon.ico" 0
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SecMain} "程序本体：后端服务、学校官网、管理后台与内置运行环境（约 100 MB）。"
  !insertmacro MUI_DESCRIPTION_TEXT ${SecDesktop} "在桌面创建「${APP_NAME}」快捷方式，双击即可启动。"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; ---------------- 卸载 ----------------
Function un.onInit
  ; NSIS 卸载器会把自身复制到临时目录后再运行，$EXEDIR 指向的是临时目录，
  ; 而编译期的 InstallDir 也可能与用户实际选择的路径不同，
  ; 因此安装路径以安装时写入注册表的值为准，读不到再退回 $EXEDIR。
  ReadRegStr $INSTDIR HKCU "Software\${APP_KEY}" "InstallDir"
  StrCmp $INSTDIR "" 0 unInitDone
    StrCpy $INSTDIR $EXEDIR
  unInitDone:
FunctionEnd

Section "Uninstall"
  Call un.KillService

  ; 询问是否一并删除业务数据
  StrCpy $0 "0"
  IfFileExists "$INSTDIR\data\school-erp.db" 0 noask
    ; /SD IDNO：静默卸载（Uninstall.exe /S）时默认「保留数据」，避免弹窗阻塞进程
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "是否同时删除业务数据？$\r$\n$\r$\n数据保存在：$INSTDIR\data$\r$\n$\r$\n[是] 一并删除，彻底清理$\r$\n[否] 保留数据文件，仅卸载程序" \
      /SD IDNO IDNO noask
    StrCpy $0 "1"
  noask:

  DetailPrint "正在删除程序文件 ..."
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\启动服务.bat"
  Delete "$INSTDIR\start.sh"
  Delete "$INSTDIR\使用说明.txt"
  Delete "$INSTDIR\icon.ico"
  Delete "$INSTDIR\.env"
  RMDir /r "$INSTDIR\server"
  RMDir /r "$INSTDIR\node"
  RMDir /r "$INSTDIR\tools"

  StrCmp $0 "1" 0 keepdata
    RMDir /r "$INSTDIR\data"
    DetailPrint "已删除数据目录"
    Goto cleanlinks
  keepdata:
    DetailPrint "已保留数据目录：$INSTDIR\data"

  cleanlinks:
  DetailPrint "正在删除快捷方式与注册表项 ..."
  Delete "$DESKTOP\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\启动服务.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\使用说明.lnk"
  Delete "$SMPROGRAMS\${APP_NAME}\卸载 ${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_KEY}"
  DeleteRegKey HKCU "Software\${APP_KEY}"

  ; 数据目录若被保留，这里会因非空而失败，属预期行为
  RMDir "$INSTDIR"
SectionEnd

Function un.KillService
  IfFileExists "$INSTDIR__SVC__\stop-service.ps1" 0 done
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR__SVC__\stop-service.ps1"'
  Pop $0
  Sleep 600
  done:
FunctionEnd
