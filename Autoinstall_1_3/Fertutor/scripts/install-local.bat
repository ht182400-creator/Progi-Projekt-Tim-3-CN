@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor - Windows 本地安装

:: 确保系统工具可用（PATH 可能被精简）
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"

set "LOG_FILE=%~dp0..\install.log"
set "APP_DIR=%~dp0.."
set "NSSM=%~dp0..\tools\nssm.exe"
set "SERVICE_NAME=Fertutor"

:: ============================================================
:: 初始化日志文件（追加模式，保留历史）
:: ============================================================
echo. >> "%LOG_FILE%"
call :log_info "========================================================"
call :log_info "  Fertutor Windows 本地安装模式  开始"
call :log_info "  时间: %date% %time%"
call :log_info "  安装目录: %APP_DIR%"
call :log_info "  脚本路径: %~f0"
call :log_info "  当前用户: %USERNAME%"
call :log_info "  计算机名: %COMPUTERNAME%"
call :log_info "  系统版本: %OS%"
for /f "tokens=*" %%v in ('ver 2^>nul') do call :log_info "  Windows版本: %%v"
call :log_info "  处理器架构: %PROCESSOR_ARCHITECTURE%"
call :log_info "  系统盘: %SystemDrive%"
for /f "tokens=2 delims==" %%m in ('wmic computersystem get TotalPhysicalMemory /value 2^>nul') do call :log_info "  物理内存(bytes): %%m"
call :log_info "  PATH: %PATH%"
call :log_info "========================================================"
echo.

:: ============================================================
:: 环境预探测 → 估算安装时长，告知进度条
:: ============================================================
set "HAS_NODE=0"
set "HAS_PG=0"
node --version >nul 2>&1 && set "HAS_NODE=1"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "HAS_PG=1"
if exist "C:\Program Files\PostgreSQL\17\bin\psql.exe" set "HAS_PG=1"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "HAS_PG=1"

:: 根据环境估算总时长（秒）
set "EST_SEC=120"
if "!HAS_NODE!"=="0" set /a EST_SEC+=900
if "!HAS_PG!"=="0"   set /a EST_SEC+=600
call :log_info "[TIMEEST] !EST_SEC!"
call :log_info "  环境预探测: HAS_NODE=!HAS_NODE! HAS_PG=!HAS_PG! 预估时长=!EST_SEC!秒"

:: ============================================================
:: [1/5] 检查/安装 Node.js
:: ============================================================
call :log_step "[1/5] 检查 Node.js..."
set "NODE_OK=0"
call :log_cmd "node --version"
node --version >nul 2>&1
set "NODE_CHECK_EC=!errorlevel!"
call :log_info "  node --version 退出码: !NODE_CHECK_EC!"
if !NODE_CHECK_EC! equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    for /f "tokens=*" %%p in ('where node 2^>nul') do call :log_info "  node 路径: %%p"
    call :log_skip "Node.js 已安装: !NODE_VER! (npm !NPM_VER!)"
    set "NODE_OK=1"
) else (
    call :log_info "Node.js 未检测到，准备安装..."
)
if "!NODE_OK!"=="0" (
    call :log_info "尝试通过 winget 安装 Node.js 20 LTS..."
    call :log_cmd "winget install --id OpenJS.NodeJS.LTS --version 20 --silent"
    winget install --id OpenJS.NodeJS.LTS --version 20 --silent --accept-package-agreements --accept-source-agreements >> "%LOG_FILE%" 2>&1
    call :log_info "winget 退出码: !errorlevel!"
    if !errorlevel! neq 0 (
        call :log_warn "winget 安装失败 (exitcode=!errorlevel!)，尝试直接下载 MSI..."
        call :download_nodejs
    )
    call :log_info "刷新 PATH 环境变量..."
    call :refresh_path
    call :log_info "  刷新后 PATH: !PATH!"
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        call :log_error "Node.js 安装失败，请手动安装: https://nodejs.org"
        exit /b 1
    )
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    for /f "tokens=*" %%p in ('where node 2^>nul') do call :log_info "  node 路径: %%p"
    call :log_info "Node.js 安装完成: !NODE_VER! (npm !NPM_VER!)"
)

:: 查找 node.exe 完整路径（兼容 PATH 未刷新的情况）
call :find_node_exe
call :log_info "  NODE_EXE 最终路径: !NODE_EXE!"
if "!NODE_EXE!"=="" (
    call :log_error "无法定位 node.exe，安装中止"
    exit /b 1
)

:: ============================================================
:: [2/5] 检查/安装 PostgreSQL
:: ============================================================
call :log_step "[2/5] 检查 PostgreSQL..."
set "PG_OK=0"
set "PSQL_PATH="
call :log_info "  扫描常见 PostgreSQL 安装路径..."
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
        set "PG_OK=1"
        call :log_info "  [找到] PostgreSQL %%v: !PSQL_PATH!"
    ) else (
        call :log_info "  [无] PostgreSQL %%v 路径不存在"
    )
)
if "!PG_OK!"=="0" (
    call :log_info "  检查注册表 HKLM\SOFTWARE\PostgreSQL..."
    reg query "HKLM\SOFTWARE\PostgreSQL" /s >nul 2>&1
    if !errorlevel! equ 0 (
        set "PG_OK=1"
        call :log_info "  通过注册表检测到 PostgreSQL"
        reg query "HKLM\SOFTWARE\PostgreSQL" /s >> "%LOG_FILE%" 2>&1
    ) else (
        call :log_info "  注册表中未找到 PostgreSQL"
    )
)

if "!PG_OK!"=="1" (
    call :log_skip "PostgreSQL 已安装"
) else (
    call :log_info "PostgreSQL 未安装，开始安装..."
    set "PG_INSTALLER=%~dp0..\docker\postgresql-16.13-2-windows-x64.exe"
    call :log_info "  安装包路径: !PG_INSTALLER!"
    if not exist "!PG_INSTALLER!" (
        call :log_error "找不到 PostgreSQL 安装包: !PG_INSTALLER!"
        exit /b 1
    )
    set "PG_SUPERACCOUNT=postgres"
    set "PG_SUPERPASSWORD=postgres123"
    set "PG_PORT=5432"
    if exist "%~dp0..\docker\postgresql.ini" (
        call :log_info "  读取 postgresql.ini 配置..."
        for /f "usebackq eol=; tokens=1,* delims==" %%a in ("%~dp0..\docker\postgresql.ini") do (
            if not "%%b"=="" (
                if "%%a"=="superaccount"  set "PG_SUPERACCOUNT=%%b"
                if "%%a"=="superpassword" set "PG_SUPERPASSWORD=%%b"
                if "%%a"=="port"          set "PG_PORT=%%b"
            )
        )
    )
    if "!PG_PORT!"=="" set "PG_PORT=5432"
    call :log_info "  PostgreSQL 配置: user=!PG_SUPERACCOUNT! port=!PG_PORT!"
    call :log_cmd "start /wait postgresql-installer --mode unattended --port !PG_PORT!"
    start /wait "" "!PG_INSTALLER!" --unattendedmodeui none --mode unattended ^
        --superaccount !PG_SUPERACCOUNT! --superpassword !PG_SUPERPASSWORD! ^
        --servicename postgresql-x64-16 --serverport !PG_PORT! >> "%LOG_FILE%" 2>&1
    call :log_info "  安装程序退出码: !errorlevel!"
    ping 127.0.0.1 -n 6 >nul
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
        call :log_info "PostgreSQL 安装完成: !PSQL_PATH!"
        sc query postgresql-x64-16 >> "%LOG_FILE%" 2>&1
    ) else (
        call :log_error "PostgreSQL 安装失败，psql.exe 未找到"
        dir "C:\Program Files\PostgreSQL\" >> "%LOG_FILE%" 2>&1
        exit /b 1
    )
)

:: 确保 psql 路径已设置
if "!PSQL_PATH!"=="" (
    for /f "tokens=*" %%p in ('where psql 2^>nul') do set "PSQL_PATH=%%p"
    if defined PSQL_PATH call :log_info "  通过 PATH 找到 psql: !PSQL_PATH!"
)
if "!PSQL_PATH!"=="" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    call :log_warn "  psql 路径未找到，使用默认: !PSQL_PATH!"
)
call :log_info "  最终 psql 路径: !PSQL_PATH!"

:: 检查 PostgreSQL 服务状态
call :log_info "  检查 PostgreSQL 服务状态..."
for %%s in (postgresql-x64-16 postgresql-x64-15 postgresql-x64-17 postgresql) do (
    sc query %%s >nul 2>&1
    if !errorlevel! equ 0 (
        call :log_info "  服务 %%s 状态:"
        sc query %%s >> "%LOG_FILE%" 2>&1
    )
)

:: ============================================================
:: [3/5] 初始化数据库
:: ============================================================
call :log_step "[3/5] 初始化数据库..."
if not defined PG_SUPERPASSWORD set "PG_SUPERPASSWORD=postgres123"
if not defined PG_SUPERACCOUNT set "PG_SUPERACCOUNT=postgres"
if not defined PG_PORT        set "PG_PORT=5432"
if "!PG_PORT!"==""            set "PG_PORT=5432"
call :log_info "  DB 参数: user=!PG_SUPERACCOUNT! port=!PG_PORT!"
set "PGPASSWORD=!PG_SUPERPASSWORD!"

:: 测试数据库连接
call :log_info "  测试数据库连接..."
call :log_cmd "psql -U !PG_SUPERACCOUNT! -p !PG_PORT! -c SELECT 1"
"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "SELECT 1;" >> "%LOG_FILE%" 2>&1
set "CONN_EC=!errorlevel!"
call :log_info "  连接测试退出码: !CONN_EC!"
if !CONN_EC! neq 0 (
    call :log_warn "  数据库连接失败，PostgreSQL 服务可能未启动，尝试启动..."
    for %%s in (postgresql-x64-16 postgresql-x64-15 postgresql-x64-17 postgresql) do (
        net start %%s >> "%LOG_FILE%" 2>&1
        call :log_info "  net start %%s 退出码: !errorlevel!"
    )
    ping 127.0.0.1 -n 4 >nul
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "SELECT 1;" >> "%LOG_FILE%" 2>&1
    set "RETRY_EC=!errorlevel!"
    call :log_info "  重试连接退出码: !RETRY_EC!"
    if !RETRY_EC! neq 0 (
        call :log_error "PostgreSQL 无法连接，请检查服务是否正常运行"
        exit /b 1
    )
)

:: 创建数据库
call :log_cmd "psql -U !PG_SUPERACCOUNT! -p !PG_PORT! -c CREATE DATABASE fertutor"
"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "CREATE DATABASE fertutor;" >> "%LOG_FILE%" 2>&1
call :log_info "  CREATE DATABASE 退出码: !errorlevel! (若库已存在则非0，属正常)"

:: 检查是否已初始化
set "DB_INITIALIZED=0"
set "TABLE_COUNT=0"
call :log_info "  检查 users 表是否存在..."
for /f "usebackq" %%r in (`"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" 2^>nul`) do set "TABLE_COUNT=%%r"
call :log_info "  users 表行数: !TABLE_COUNT!"
if "!TABLE_COUNT!"=="1" set "DB_INITIALIZED=1"

if "!DB_INITIALIZED!"=="1" (
    call :log_skip "数据库已初始化，跳过导入"
) else (
    call :log_info "导入数据库结构..."

    call :log_cmd "psql -f baze.sql"
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\baze.sql" >> "%LOG_FILE%" 2>&1
    call :log_info "  baze.sql 退出码: !errorlevel!"

    call :log_cmd "psql -f migration_admin.sql"
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\migration_admin.sql" >> "%LOG_FILE%" 2>&1
    call :log_info "  migration_admin.sql 退出码: !errorlevel!"

    if exist "%APP_DIR%\app\server\baze\testingData.sql" (
        call :log_cmd "psql -f testingData.sql"
        "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\testingData.sql" >> "%LOG_FILE%" 2>&1
        call :log_info "  testingData.sql 退出码: !errorlevel!"
    )

    call :log_info "  扫描 migrations 目录..."
    for %%f in ("%APP_DIR%\app\server\baze\migrations\*.sql") do (
        call :log_cmd "psql -f %%~nxf"
        "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%%f" >> "%LOG_FILE%" 2>&1
        call :log_info "  %%~nxf 退出码: !errorlevel!"
    )
    call :log_info "数据库初始化完成"
)

:: ============================================================
:: [4/5] 安装依赖 + 构建前端
:: ============================================================
call :log_step "[4/5] 安装依赖并构建前端..."

:: 生成 .env 文件
if not exist "%APP_DIR%\app\server\.env" (
    call :log_info "生成服务器 .env 配置文件..."
    (
        echo DB_HOST=localhost
        echo DB_PORT=!PG_PORT!
        echo DB_NAME=fertutor
        echo DB_USER=!PG_SUPERACCOUNT!
        echo DB_PASSWORD=!PG_SUPERPASSWORD!
        echo PORT=8080
        echo HOST=0.0.0.0
        echo NODE_ENV=production
        echo FRONTEND_URL=http://localhost:8080
        echo JWT_SECRET=change-me-jwt-secret-please
        echo VERIFY_SECRET=change-me-verify-secret
        echo RESET_SECRET=change-me-reset-secret
        echo GOOGLE_CLIENT_ID=
        echo GOOGLE_CLIENT_SECRET=
    ) > "%APP_DIR%\app\server\.env"
    call :log_info "  .env 已生成: %APP_DIR%\app\server\.env"
    call :log_warn "  请编辑 .env 修改 JWT_SECRET 等密钥！"
) else (
    call :log_skip ".env 已存在，跳过生成"
)

:: 安装后端依赖
call :log_info "安装后端 npm 依赖..."
call :log_cmd "npm install --omit=dev (server)"
pushd "%APP_DIR%\app\server"
call :log_info "  当前目录: %CD%"
call "!NODE_EXE:node.exe=npm.cmd!" install --omit=dev --prefer-offline >> "%LOG_FILE%" 2>&1
set "NPM_EC=!errorlevel!"
popd
call :log_info "  npm install (server) 退出码: !NPM_EC!"
if !NPM_EC! neq 0 (
    call :log_error "后端依赖安装失败 (exitcode=!NPM_EC!)"
    call "!NODE_EXE:node.exe=npm.cmd!" cache verify >> "%LOG_FILE%" 2>&1
    exit /b 1
)
call :log_info "  后端依赖安装成功"

:: 安装前端依赖并构建
set "CLIENT_DIST=%APP_DIR%\app\client\dist"
if exist "!CLIENT_DIST!\index.html" (
    call :log_skip "前端已构建 (dist/index.html 存在)"
) else (
    call :log_info "安装前端 npm 依赖..."
    call :log_cmd "npm install (client)"
    pushd "%APP_DIR%\app\client"
    call :log_info "  当前目录: %CD%"
    call "!NODE_EXE:node.exe=npm.cmd!" install --prefer-offline >> "%LOG_FILE%" 2>&1
    call :log_info "  npm install (client) 退出码: !errorlevel!"

    call :log_info "构建前端..."
    call :log_cmd "npm run build (client)"
    call "!NODE_EXE:node.exe=npm.cmd!" run build >> "%LOG_FILE%" 2>&1
    set "BUILD_EC=!errorlevel!"
    popd
    call :log_info "  npm run build 退出码: !BUILD_EC!"
    if !BUILD_EC! neq 0 (
        call :log_error "前端构建失败 (exitcode=!BUILD_EC!)，请见日志: %LOG_FILE%"
        exit /b 1
    )
    call :log_info "前端构建完成"
    dir "!CLIENT_DIST!" /s /b >> "%LOG_FILE%" 2>&1
)

:: ============================================================
:: [5/5] 注册 Windows 服务 (NSSM)
:: ============================================================
call :log_step "[5/5] 注册 Windows 服务 (NSSM)..."
call :log_info "  NSSM 路径: !NSSM!"

if not exist "!NSSM!" (
    call :log_error "找不到 nssm.exe: !NSSM!"
    exit /b 1
)

:: 重新探测 node.exe（PATH 可能在安装后已更新）
call :refresh_path
set "NODE_EXE="
for /f "tokens=*" %%n in ('where node 2^>nul') do (
    if not defined NODE_EXE set "NODE_EXE=%%n"
)
if not defined NODE_EXE (
    for %%d in (
        "%ProgramFiles%\nodejs\node.exe"
        "%ProgramFiles(x86)%\nodejs\node.exe"
        "%LOCALAPPDATA%\Programs\nodejs\node.exe"
    ) do (
        if exist %%d if not defined NODE_EXE set "NODE_EXE=%%~d"
    )
)
if not defined NODE_EXE (
    for /f "tokens=*" %%p in ('powershell -NoProfile -Command "(Get-Command node -ErrorAction SilentlyContinue).Source" 2^>nul') do set "NODE_EXE=%%p"
)
call :log_info "  Node.js 可执行文件: !NODE_EXE!"
if not defined NODE_EXE (
    call :log_error "找不到 node.exe，无法注册服务！"
    exit /b 1
)

:: 无条件清除旧服务（忽略错误），确保干净安装
call :log_info "  清除旧服务（如存在）..."
"!NSSM!" stop "!SERVICE_NAME!" >nul 2>&1
call :log_info "  nssm stop 退出码: !errorlevel!"
ping 127.0.0.1 -n 2 >nul
"!NSSM!" remove "!SERVICE_NAME!" confirm >nul 2>&1
call :log_info "  nssm remove 退出码: !errorlevel!"
%SystemRoot%\System32\sc.exe stop "!SERVICE_NAME!" >nul 2>&1
%SystemRoot%\System32\sc.exe delete "!SERVICE_NAME!" >nul 2>&1
call :log_info "  sc delete 退出码: !errorlevel!"
ping 127.0.0.1 -n 2 >nul

if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

call :log_cmd "nssm install !SERVICE_NAME! [node.exe] server.js"
"!NSSM!" install "!SERVICE_NAME!" "!NODE_EXE!" server.js >> "%LOG_FILE%" 2>&1
set "NSSM_INSTALL_EC=!errorlevel!"
call :log_info "  nssm install 退出码: !NSSM_INSTALL_EC!"
if !NSSM_INSTALL_EC! neq 0 (
    call :log_error "nssm install 失败 (exitcode=!NSSM_INSTALL_EC!)"
    exit /b 1
)
"!NSSM!" set "!SERVICE_NAME!" AppDirectory    "%APP_DIR%\app\server"   >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppEnvironmentExtra "NODE_ENV=production" >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" DisplayName     "Fertutor Web Server"    >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" Description     "Fertutor 教育平台后端服务" >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" Start           SERVICE_AUTO_START       >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppStdout       "%APP_DIR%\logs\server.log"       >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppStderr       "%APP_DIR%\logs\server-error.log" >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppRotateFiles  1                        >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppRotateBytes  10485760                 >> "%LOG_FILE%" 2>&1

:: 用 sc start 异步启动（不等待服务进入 RUNNING，立即返回）
call :log_cmd "sc start !SERVICE_NAME!"
%SystemRoot%\System32\sc.exe start "!SERVICE_NAME!" >> "%LOG_FILE%" 2>&1
set "NSSM_EC=!errorlevel!"
call :log_info "  sc start 退出码: !NSSM_EC! (1056=已在运行，均属正常)"
call :log_info "服务已发送启动指令，后台继续启动中..."
ping 127.0.0.1 -n 4 >nul
%SystemRoot%\System32\sc.exe query "!SERVICE_NAME!" >> "%LOG_FILE%" 2>&1

call :log_info "========================================================"
call :log_info "  本地安装完成  %date% %time%"
call :log_info "  日志文件: %LOG_FILE%"
call :log_info "========================================================"

ping 127.0.0.1 -n 4 >nul
exit /b 0

:: ============================================================
:: 日志函数
:: ============================================================
:log_step
echo.
echo [%time%] === %~1 ===
echo [%date% %time%] [STEP] %~1 >> "%LOG_FILE%"
goto :eof

:log_info
echo [%time%] %~1
echo [%date% %time%] [INFO] %~1 >> "%LOG_FILE%"
goto :eof

:log_skip
echo [%time%] [跳过] %~1
echo [%date% %time%] [SKIP] %~1 >> "%LOG_FILE%"
goto :eof

:log_warn
echo [%time%] [警告] %~1
echo [%date% %time%] [WARN] %~1 >> "%LOG_FILE%"
goto :eof

:log_error
echo [%time%] [错误] %~1
echo [%date% %time%] [ERROR] %~1 >> "%LOG_FILE%"
goto :eof

:log_cmd
echo [%time%] [CMD] %~1
echo [%date% %time%] [CMD] %~1 >> "%LOG_FILE%"
goto :eof

:: ============================================================
:: 工具函数
:: ============================================================

:: 查找 node.exe 完整路径
:find_node_exe
set "NODE_EXE="
for /f "tokens=*" %%p in ('where node 2^>nul') do (
    if "!NODE_EXE!"=="" set "NODE_EXE=%%p"
)
if defined NODE_EXE goto :eof

for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul') do (
    if exist "%%b\node.exe" set "NODE_EXE=%%b\node.exe"
)
if defined NODE_EXE goto :eof

for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Node.js" /v InstallPath 2^>nul') do (
    if exist "%%b\node.exe" set "NODE_EXE=%%b\node.exe"
)
if defined NODE_EXE goto :eof

for %%d in (
    "C:\Program Files\nodejs\node.exe"
    "C:\Program Files (x86)\nodejs\node.exe"
) do (
    if exist %%d (
        if "!NODE_EXE!"=="" set "NODE_EXE=%%~d"
    )
)
if defined NODE_EXE goto :eof

for /d %%d in ("%APPDATA%\nvm\v*") do (
    if exist "%%d\node.exe" (
        if "!NODE_EXE!"=="" set "NODE_EXE=%%d\node.exe"
    )
)
goto :eof

:refresh_path
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%b"
set "PATH=!SYS_PATH!;!USR_PATH!"
goto :eof

:download_nodejs
call :log_info "从官网下载 Node.js 20 LTS..."
set "NODE_URL=https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
set "NODE_MSI=%TEMP%\node-v20-x64.msi"
call :log_cmd "Invoke-WebRequest %NODE_URL%"
powershell -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_MSI!'" >> "%LOG_FILE%" 2>&1
call :log_info "  下载退出码: !errorlevel!"
if exist "!NODE_MSI!" (
    call :log_cmd "msiexec /i node-v20-x64.msi /quiet"
    start /wait msiexec /i "!NODE_MSI!" /quiet /norestart >> "%LOG_FILE%" 2>&1
    call :log_info "  msiexec 退出码: !errorlevel!"
    del "!NODE_MSI!" >nul 2>&1
) else (
    call :log_error "Node.js MSI 下载失败"
)
goto :eof
