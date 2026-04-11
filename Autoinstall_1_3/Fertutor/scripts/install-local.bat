@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor - Windows 本地安装

set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"
set "LOG_FILE=%~dp0..\install.log"
set "STATUS_FILE=%~dp0..\install.status"
set "APP_DIR=%~dp0.."
set "NSSM=%~dp0..\tools\nssm.exe"
set "SERVICE_NAME=Fertutor"
:: 解析 APP_DIR 为绝对路径
pushd "%APP_DIR%"
set "APP_DIR=%CD%"
popd
set "NSSM=%APP_DIR%\tools\nssm.exe"

:: 清空状态文件（新安装开始）
echo. > "%STATUS_FILE%"

:: ============================================================
:: 初始化日志（超过 5MB 则轮转）
:: ============================================================
if exist "%LOG_FILE%" (
    for %%s in ("%LOG_FILE%") do (
        if %%~zs gtr 5242880 (
            move /y "%LOG_FILE%" "%~dp0..\install.log.bak" >nul 2>&1
        )
    )
)
echo. >> "%LOG_FILE%"
call :log_info "========================================================"
call :log_info "  Fertutor Windows 本地安装  开始"
call :log_info "  时间: %date% %time%"
call :log_info "  安装目录: %APP_DIR%"
call :log_info "  当前用户: %USERNAME%  计算机: %COMPUTERNAME%"
for /f "tokens=*" %%v in ('ver 2^>nul') do call :log_info "  Windows: %%v"
call :log_info "========================================================"

:: ============================================================
:: 环境预探测 → 估算安装时长
:: ============================================================
set "HAS_NODE=0"
set "HAS_PG=0"
node --version >nul 2>&1 && set "HAS_NODE=1"
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" set "HAS_PG=1"
)
set "EST_SEC=120"
if "!HAS_NODE!"=="0" set /a EST_SEC+=900
if "!HAS_PG!"=="0"   set /a EST_SEC+=600
call :log_info "[TIMEEST] !EST_SEC!"
call :log_info "  预探测: HAS_NODE=!HAS_NODE! HAS_PG=!HAS_PG! 预估=!EST_SEC!秒"

:: 磁盘空间检查（需要至少 2GB）
call :log_info "检查磁盘空间..."
set "FREE_GB=0"
powershell -NoProfile -Command "$gb=[math]::Floor((Get-PSDrive C).Free/1GB); [System.IO.File]::WriteAllText('%TEMP%\fertutor_disk.txt',$gb.ToString())" 2>nul
if exist "%TEMP%\fertutor_disk.txt" (
    set /p FREE_GB=<"%TEMP%\fertutor_disk.txt"
    del "%TEMP%\fertutor_disk.txt" >nul 2>&1
)
set "FREE_GB=!FREE_GB: =!"
set "FREE_GB=!FREE_GB:	=!"
call :log_info "  可用空间: !FREE_GB! GB"
if !FREE_GB! lss 2 (
    if "!FREE_GB!"=="0" (
        call :log_warn "  无法检测磁盘空间，继续安装"
    ) else (
        call :log_fatal "磁盘空间不足（需要至少 2GB，当前 !FREE_GB! GB）"
        exit /b 1
    )
)

:: ============================================================
:: [1/5] 检查/安装 Node.js
:: ============================================================
call :log_step "[1/5] 检查 Node.js..."
set "NODE_OK=0"
node --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    for /f "tokens=*" %%v in ('npm --version 2^>nul') do set "NPM_VER=%%v"
    call :log_skip "Node.js 已安装: !NODE_VER! (npm !NPM_VER!)"
    set "NODE_OK=1"
)

if "!NODE_OK!"=="0" (
    call :log_info "Node.js 未检测到，尝试 winget 安装..."
    winget install --id OpenJS.NodeJS.LTS --version 20 --silent --accept-package-agreements --accept-source-agreements >> "%LOG_FILE%" 2>&1
    set "WINGET_EC=!errorlevel!"
    call :log_info "  winget 退出码: !WINGET_EC!"
    if !WINGET_EC! neq 0 (
        call :log_warn "  winget 失败，尝试下载 MSI..."
        call :download_nodejs
    )
    call :refresh_path
    node --version >nul 2>&1
    if !errorlevel! neq 0 (
        call :log_fatal "Node.js 安装失败，请手动安装后重试: https://nodejs.org"
        exit /b 1
    )
    for /f "tokens=*" %%v in ('node --version 2^>nul') do set "NODE_VER=%%v"
    call :log_info "Node.js 安装完成: !NODE_VER!"
)

:: 定位 node.exe 和 npm.cmd
call :find_node_exe
if "!NODE_EXE!"=="" (
    call :log_fatal "无法定位 node.exe，安装中止"
    exit /b 1
)
call :log_info "  NODE_EXE: !NODE_EXE!"

:: 推导 npm.cmd
for %%d in ("!NODE_EXE!") do set "NODE_DIR=%%~dpd"
if "!NODE_DIR:~-1!"=="\" set "NODE_DIR=!NODE_DIR:~0,-1!"
set "NPM_CMD=!NODE_DIR!\npm.cmd"
if not exist "!NPM_CMD!" (
    for /f "tokens=*" %%p in ('where npm 2^>nul') do set "NPM_CMD=%%p"
)
if not exist "!NPM_CMD!" (
    call :log_fatal "无法定位 npm.cmd，安装中止"
    exit /b 1
)
call :log_info "  NPM_CMD: !NPM_CMD!"

:: ============================================================
:: [2/5] 检查/安装 PostgreSQL
:: ============================================================
call :log_step "[2/5] 检查 PostgreSQL..."
set "PG_OK=0"
set "PSQL_PATH="
set "PG_SVC_NAME="

for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        if "!PG_OK!"=="0" (
            set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
            set "PG_OK=1"
            call :log_info "  [找到] PostgreSQL %%v"
        )
    )
)

if "!PG_OK!"=="1" (
    :: 检查服务是否存在
    for /f "usebackq tokens=*" %%s in (`powershell -NoProfile -Command "Get-Service | Where-Object {$_.Name -like '*postgresql*'} | Select-Object -First 1 -ExpandProperty Name" 2^>nul`) do set "PG_SVC_NAME=%%s"
    call :log_info "  PostgreSQL 服务名: !PG_SVC_NAME!"
    if defined PG_SVC_NAME (
        call :log_skip "PostgreSQL 已安装且服务存在: !PG_SVC_NAME!"
    ) else (
        call :log_warn "  psql.exe 存在但服务不存在，执行强制清理后重装..."
        call :force_remove_pg
        set "PG_OK=0"
        set "PSQL_PATH="
    )
)

if "!PG_OK!"=="0" (
    call :log_info "开始安装 PostgreSQL..."
    set "PG_INSTALLER=%~dp0..\docker\postgresql-16.13-2-windows-x64.exe"
    if not exist "!PG_INSTALLER!" (
        call :log_fatal "找不到 PostgreSQL 安装包: !PG_INSTALLER!"
        exit /b 1
    )
    set "PG_SUPERACCOUNT=postgres"
    set "PG_SUPERPASSWORD=postgres123"
    set "PG_PORT=5432"
    if exist "%~dp0..\docker\postgresql.ini" (
        for /f "usebackq eol=; tokens=1,* delims==" %%a in ("%~dp0..\docker\postgresql.ini") do (
            if not "%%b"=="" (
                if "%%a"=="superaccount"  set "PG_SUPERACCOUNT=%%b"
                if "%%a"=="superpassword" set "PG_SUPERPASSWORD=%%b"
                if "%%a"=="port"          set "PG_PORT=%%b"
            )
        )
    )
    if "!PG_PORT!"=="" set "PG_PORT=5432"
    call :log_info "  安装配置: user=!PG_SUPERACCOUNT! port=!PG_PORT!"
    start /wait "" "!PG_INSTALLER!" --unattendedmodeui none --mode unattended ^
        --superaccount !PG_SUPERACCOUNT! --superpassword !PG_SUPERPASSWORD! ^
        --servicename postgresql-x64-16 --serverport !PG_PORT! >> "%LOG_FILE%" 2>&1
    call :log_info "  安装程序退出码: !errorlevel!"
    ping 127.0.0.1 -n 6 >nul
    if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" (
        set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
        set "PG_SVC_NAME=postgresql-x64-16"
        call :log_info "PostgreSQL 安装完成"
    ) else (
        call :log_fatal "PostgreSQL 安装失败，psql.exe 未找到"
        exit /b 1
    )
)

if "!PSQL_PATH!"=="" (
    for /f "tokens=*" %%p in ('where psql 2^>nul') do set "PSQL_PATH=%%p"
)
if "!PSQL_PATH!"=="" (
    set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
    call :log_warn "  psql 路径未找到，使用默认"
)
call :log_info "  psql 路径: !PSQL_PATH!"

:: ============================================================
:: [3/5] 初始化数据库
:: ============================================================
call :log_step "[3/5] 初始化数据库..."
if not defined PG_SUPERPASSWORD set "PG_SUPERPASSWORD=postgres123"
if not defined PG_SUPERACCOUNT  set "PG_SUPERACCOUNT=postgres"
if not defined PG_PORT          set "PG_PORT=5432"
if "!PG_PORT!"==""              set "PG_PORT=5432"
set "PGPASSWORD=!PG_SUPERPASSWORD!"
call :log_info "  DB: user=!PG_SUPERACCOUNT! port=!PG_PORT!"

:: 测试连接，失败则尝试启动服务
"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "SELECT 1;" >> "%LOG_FILE%" 2>&1
set "CONN_EC=!errorlevel!"
call :log_info "  连接测试退出码: !CONN_EC!"
if !CONN_EC! neq 0 (
    call :log_warn "  连接失败，尝试启动 PostgreSQL 服务..."
    if not defined PG_SVC_NAME (
        for /f "usebackq tokens=*" %%s in (`powershell -NoProfile -Command "Get-Service | Where-Object {$_.Name -like '*postgresql*'} | Select-Object -First 1 -ExpandProperty Name" 2^>nul`) do set "PG_SVC_NAME=%%s"
    )
    if defined PG_SVC_NAME (
        net start "!PG_SVC_NAME!" >> "%LOG_FILE%" 2>&1
        call :log_info "  net start !PG_SVC_NAME! 退出码: !errorlevel!"
    ) else (
        call :log_warn "  未找到服务名，尝试常见名称..."
        for %%s in (postgresql-x64-16 postgresql-x64-15 postgresql-x64-17 postgresql-x64-14 postgresql) do (
            %SystemRoot%\System32\sc.exe query %%s >nul 2>&1
            if !errorlevel! equ 0 (
                net start %%s >> "%LOG_FILE%" 2>&1
                call :log_info "  net start %%s: !errorlevel!"
            )
        )
    )
    ping 127.0.0.1 -n 4 >nul
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "SELECT 1;" >> "%LOG_FILE%" 2>&1
    if !errorlevel! neq 0 (
        call :log_fatal "PostgreSQL 无法连接，请检查服务是否正常运行"
        exit /b 1
    )
    call :log_info "  PostgreSQL 连接成功"
)

:: 创建数据库（已存在则忽略错误）
"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -c "CREATE DATABASE fertutor;" >> "%LOG_FILE%" 2>&1
call :log_info "  CREATE DATABASE 退出码: !errorlevel! (已存在则非0，正常)"

:: 检查是否已初始化
set "TABLE_COUNT=0"
for /f "usebackq" %%r in (`"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" 2^>nul`) do set "TABLE_COUNT=%%r"
call :log_info "  users 表存在: !TABLE_COUNT!"

if "!TABLE_COUNT!"=="1" (
    call :log_skip "数据库已初始化，检查并执行新 migration..."
    :: 即使已初始化，也执行 migrations 目录下的新文件
    for %%f in ("%APP_DIR%\app\server\baze\migrations\*.sql") do (
        "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%%f" >> "%LOG_FILE%" 2>&1
        call :log_info "  migration %%~nxf: !errorlevel!"
    )
) else (
    call :log_info "导入数据库结构..."
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\baze.sql" >> "%LOG_FILE%" 2>&1
    call :log_info "  baze.sql: !errorlevel!"
    "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\migration_admin.sql" >> "%LOG_FILE%" 2>&1
    call :log_info "  migration_admin.sql: !errorlevel!"
    if exist "%APP_DIR%\app\server\baze\testingData.sql" (
        "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%APP_DIR%\app\server\baze\testingData.sql" >> "%LOG_FILE%" 2>&1
        call :log_info "  testingData.sql: !errorlevel!"
    )
    for %%f in ("%APP_DIR%\app\server\baze\migrations\*.sql") do (
        "!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -f "%%f" >> "%LOG_FILE%" 2>&1
        call :log_info "  %%~nxf: !errorlevel!"
    )
    call :log_info "数据库初始化完成"
)

:: ============================================================
:: [4/5] 安装依赖 + 构建前端
:: ============================================================
call :log_step "[4/5] 安装依赖并构建前端..."

if not exist "%APP_DIR%\app\server\.env" (
    call :log_info "生成 .env 配置文件..."
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
    call :log_info "  .env 已生成"
    call :log_warn "  请编辑 .env 修改 JWT_SECRET 等密钥！"
) else (
    call :log_skip ".env 已存在"
)

call :log_info "安装后端依赖..."
pushd "%APP_DIR%\app\server"
call "!NPM_CMD!" install --omit=dev --prefer-offline >> "%LOG_FILE%" 2>&1
set "NPM_EC=!errorlevel!"
popd
call :log_info "  npm install (server): !NPM_EC!"
if !NPM_EC! neq 0 (
    call :log_fatal "后端依赖安装失败 (exitcode=!NPM_EC!)"
    exit /b 1
)

set "CLIENT_DIST=%APP_DIR%\app\client\dist"
if exist "!CLIENT_DIST!\index.html" (
    call :log_skip "前端已构建"
) else (
    call :log_info "安装前端依赖..."
    pushd "%APP_DIR%\app\client"
    call "!NPM_CMD!" install --prefer-offline >> "%LOG_FILE%" 2>&1
    call :log_info "  npm install (client): !errorlevel!"
    call :log_info "构建前端..."
    call "!NPM_CMD!" run build >> "%LOG_FILE%" 2>&1
    set "BUILD_EC=!errorlevel!"
    popd
    call :log_info "  npm run build: !BUILD_EC!"
    if !BUILD_EC! neq 0 (
        call :log_fatal "前端构建失败 (exitcode=!BUILD_EC!)"
        exit /b 1
    )
    call :log_info "前端构建完成"
)

:: ============================================================
:: [5/5] 注册 Windows 服务 (NSSM)
:: ============================================================
call :log_step "[5/5] 注册 Windows 服务 (NSSM)..."

:: 检查 8080 端口是否被占用
call :log_info "  检查 8080 端口..."
%SystemRoot%\System32\netstat.exe -ano | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=5" %%p in ('%SystemRoot%\System32\netstat.exe -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
        call :log_warn "  8080 端口被 PID %%p 占用"
        for /f "tokens=1" %%n in ('tasklist /fi "PID eq %%p" /fo csv /nh 2^>nul') do (
            call :log_warn "  占用进程: %%n (PID %%p)"
        )
    )
    call :log_warn "  8080 端口已被占用，服务可能无法启动，请检查后重试"
) else (
    call :log_info "  8080 端口可用"
)

if not exist "!NSSM!" (
    call :log_fatal "找不到 nssm.exe: !NSSM!"
    exit /b 1
)

:: 重新探测 node.exe
call :refresh_path
set "NODE_EXE="
for /f "tokens=*" %%n in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%n"
if not defined NODE_EXE (
    for %%d in ("%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe") do (
        if exist %%d if not defined NODE_EXE set "NODE_EXE=%%~d"
    )
)
if not defined NODE_EXE (
    call :log_fatal "找不到 node.exe，无法注册服务"
    exit /b 1
)
call :log_info "  node.exe: !NODE_EXE!"

:: 清除旧服务
"!NSSM!" stop "!SERVICE_NAME!" >nul 2>&1
ping 127.0.0.1 -n 2 >nul
"!NSSM!" remove "!SERVICE_NAME!" confirm >nul 2>&1
%SystemRoot%\System32\sc.exe delete "!SERVICE_NAME!" >nul 2>&1
ping 127.0.0.1 -n 2 >nul

if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

"!NSSM!" install "!SERVICE_NAME!" "!NODE_EXE!" server.js >> "%LOG_FILE%" 2>&1
set "NSSM_EC=!errorlevel!"
call :log_info "  nssm install: !NSSM_EC!"
if !NSSM_EC! neq 0 (
    call :log_fatal "nssm install 失败 (exitcode=!NSSM_EC!)"
    exit /b 1
)
"!NSSM!" set "!SERVICE_NAME!" AppDirectory         "%APP_DIR%\app\server"            >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppEnvironmentExtra  "NODE_ENV=production"             >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" DisplayName          "Fertutor Web Server"             >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" Description          "Fertutor 教育平台后端服务"        >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" Start                SERVICE_AUTO_START                >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppStdout            "%APP_DIR%\logs\server.log"       >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppStderr            "%APP_DIR%\logs\server-error.log" >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppRotateFiles       1                                 >> "%LOG_FILE%" 2>&1
"!NSSM!" set "!SERVICE_NAME!" AppRotateBytes       10485760                          >> "%LOG_FILE%" 2>&1

%SystemRoot%\System32\sc.exe start "!SERVICE_NAME!" >> "%LOG_FILE%" 2>&1
call :log_info "  sc start: !errorlevel! (1056=已在运行，正常)"

:: 防火墙规则
call :log_info "  添加防火墙规则 (8080)..."
netsh advfirewall firewall delete rule name="Fertutor Web Server" >nul 2>&1
netsh advfirewall firewall add rule name="Fertutor Web Server" dir=in action=allow protocol=TCP localport=8080 >nul 2>&1
call :log_info "  防火墙规则: !errorlevel!"

:: 安装后验证（等服务启动）
call :log_info "  等待服务就绪（8秒）..."
ping 127.0.0.1 -n 9 >nul
%SystemRoot%\System32\sc.exe query "!SERVICE_NAME!" | findstr "RUNNING" >nul 2>&1
if !errorlevel! equ 0 (
    call :log_info "  服务状态: RUNNING"
) else (
    call :log_warn "  服务尚未 RUNNING，可能仍在启动中"
)
for /f "tokens=*" %%r in ('curl -s -o nul -w "%%{http_code}" --connect-timeout 5 http://localhost:8080 2^>nul') do (
    call :log_info "  HTTP 响应码: %%r"
)
"!PSQL_PATH!" -U !PG_SUPERACCOUNT! -p !PG_PORT! -d fertutor -c "SELECT COUNT(*) FROM users;" >nul 2>&1
if !errorlevel! equ 0 (
    call :log_info "  数据库验证通过"
) else (
    call :log_warn "  数据库验证失败，请检查日志"
)

call :log_info "========================================================"
call :log_info "  本地安装完成  %date% %time%"
call :log_info "  日志: %LOG_FILE%"
call :log_info "========================================================"
exit /b 0

:: ============================================================
:: 日志函数
:: ============================================================
:log_step
echo [%date% %time%] [STEP] %~1 >> "%LOG_FILE%"
echo [STEP] %~1 >> "%STATUS_FILE%"
echo.& echo [%time%] === %~1 ===
goto :eof

:log_info
echo [%date% %time%] [INFO] %~1 >> "%LOG_FILE%"
echo [INFO] %~1 >> "%STATUS_FILE%"
echo [%time%] %~1
goto :eof

:log_skip
echo [%date% %time%] [SKIP] %~1 >> "%LOG_FILE%"
echo [SKIP] %~1 >> "%STATUS_FILE%"
echo [%time%] [跳过] %~1
goto :eof

:log_warn
echo [%date% %time%] [WARN] %~1 >> "%LOG_FILE%"
echo [WARN] %~1 >> "%STATUS_FILE%"
echo [%time%] [警告] %~1
goto :eof

:log_error
echo [%date% %time%] [ERROR] %~1 >> "%LOG_FILE%"
echo [ERROR] %~1 >> "%STATUS_FILE%"
echo [%time%] [错误] %~1
goto :eof

:log_fatal
echo [%date% %time%] [ERROR] %~1 >> "%LOG_FILE%"
echo [%date% %time%] [FATAL] %~1 >> "%LOG_FILE%"
echo [FATAL] %~1 >> "%STATUS_FILE%"
echo [%time%] [致命错误] %~1
goto :eof

:: ============================================================
:: 强制清理 PostgreSQL 残留
:: ============================================================
:force_remove_pg
call :log_info "  [清理] 开始强制清理 PostgreSQL 残留..."
set "PG_UNINSTALL="
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\uninstall-postgresql.exe" (
        if not defined PG_UNINSTALL set "PG_UNINSTALL=C:\Program Files\PostgreSQL\%%v\uninstall-postgresql.exe"
    )
)
if defined PG_UNINSTALL (
    call :log_info "  [清理] 运行卸载程序..."
    start /wait "" "!PG_UNINSTALL!" --mode unattended >> "%LOG_FILE%" 2>&1
    call :log_info "  [清理] 卸载退出码: !errorlevel!"
    ping 127.0.0.1 -n 4 >nul
)
call :log_info "  [清理] 终止 PostgreSQL 进程..."
for %%p in (postgres.exe pg_ctl.exe pgAdmin4.exe) do (
    taskkill /f /im %%p >nul 2>&1
)
ping 127.0.0.1 -n 2 >nul
for %%s in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql) do (
    %SystemRoot%\System32\sc.exe delete %%s >nul 2>&1
)
call :log_info "  [清理] 删除安装目录..."
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v" (
        rd /s /q "C:\Program Files\PostgreSQL\%%v" >> "%LOG_FILE%" 2>&1
        call :log_info "  [清理] 删除 PostgreSQL\%%v: !errorlevel!"
    )
)
reg delete "HKLM\SOFTWARE\PostgreSQL" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\WOW6432Node\PostgreSQL" /f >nul 2>&1
call :log_info "  [清理] 完成"
goto :eof

:: ============================================================
:: 工具函数
:: ============================================================
:find_node_exe
set "NODE_EXE="
for /f "tokens=*" %%p in ('where node 2^>nul') do if "!NODE_EXE!"=="" set "NODE_EXE=%%p"
if defined NODE_EXE goto :eof
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul') do (
    if exist "%%b\node.exe" set "NODE_EXE=%%b\node.exe"
)
if defined NODE_EXE goto :eof
for /f "tokens=2*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Node.js" /v InstallPath 2^>nul') do (
    if exist "%%b\node.exe" set "NODE_EXE=%%b\node.exe"
)
if defined NODE_EXE goto :eof
for %%d in ("C:\Program Files\nodejs\node.exe" "C:\Program Files (x86)\nodejs\node.exe") do (
    if exist %%d if "!NODE_EXE!"=="" set "NODE_EXE=%%~d"
)
goto :eof

:refresh_path
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USR_PATH=%%b"
set "PATH=!SYS_PATH!;!USR_PATH!"
goto :eof

:download_nodejs
call :log_info "  下载 Node.js 20 LTS MSI..."
set "NODE_URL=https://nodejs.org/dist/v20.19.0/node-v20.19.0-x64.msi"
set "NODE_MSI=%TEMP%\node-v20-x64.msi"
powershell -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_MSI!'" >> "%LOG_FILE%" 2>&1
if exist "!NODE_MSI!" (
    start /wait msiexec /i "!NODE_MSI!" /quiet /norestart >> "%LOG_FILE%" 2>&1
    call :log_info "  msiexec 退出码: !errorlevel!"
    del "!NODE_MSI!" >nul 2>&1
) else (
    call :log_warn "  Node.js MSI 下载失败"
)
goto :eof
