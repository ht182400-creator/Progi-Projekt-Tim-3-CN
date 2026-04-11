@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor - Docker 安装

set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"
set "LOG_FILE=%~dp0..\install.log"
set "STATUS_FILE=%~dp0..\install.status"
set "APP_DIR=%~dp0.."

:: 清空状态文件
echo. > "%STATUS_FILE%"

:: ============================================================
:: 初始化日志
:: ============================================================
echo. >> "%LOG_FILE%"
call :log_info "========================================================"
call :log_info "  Fertutor Docker 安装模式  开始"
call :log_info "  时间: %date% %time%"
call :log_info "  安装目录: %APP_DIR%"
call :log_info "  当前用户: %USERNAME%  计算机: %COMPUTERNAME%"
for /f "tokens=*" %%v in ('ver 2^>nul') do call :log_info "  Windows: %%v"
call :log_info "========================================================"

:: ============================================================
:: 环境预探测 → 估算安装时长
:: ============================================================
set "HAS_DOCKER=0"
docker --version >nul 2>&1 && set "HAS_DOCKER=1"
set "EST_SEC=180"
if "!HAS_DOCKER!"=="0" set /a EST_SEC+=900
call :log_info "[TIMEEST] !EST_SEC!"
call :log_info "  预探测: HAS_DOCKER=!HAS_DOCKER! 预估=!EST_SEC!秒"

:: ============================================================
:: [1/3] 检查/安装 Docker Desktop
:: ============================================================
call :log_step "[1/3] 检查 Docker Desktop..."
docker --version >nul 2>&1
if !errorlevel! equ 0 (
    for /f "tokens=*" %%v in ('docker --version 2^>nul') do set "DOCKER_VER=%%v"
    call :log_skip "Docker 已安装: !DOCKER_VER!"
) else (
    call :log_info "Docker 未检测到，准备安装..."
    set "DOCKER_INSTALLER=%APP_DIR%\docker\Docker Desktop Installer.exe"
    if not exist "!DOCKER_INSTALLER!" (
        call :log_fatal "找不到 Docker Desktop 安装包: !DOCKER_INSTALLER!"
        exit /b 1
    )
    set "DOCKER_ARGS=install --quiet --accept-license --noreboot"
    if exist "%APP_DIR%\docker\docker.ini" (
        for /f "usebackq eol=; tokens=1,* delims==" %%a in ("%APP_DIR%\docker\docker.ini") do (
            if not "%%b"=="" if "%%a"=="mode" set "DOCKER_ARGS=install %%b"
        )
    )
    call :log_info "  运行 Docker Desktop 安装程序..."
    start /wait "" "!DOCKER_INSTALLER!" !DOCKER_ARGS! >> "%LOG_FILE%" 2>&1
    call :log_info "  Docker 安装程序退出码: !errorlevel!"
    call :log_info "Docker 安装完成，需要重启后生效"
    call :log_warn "重启后请重新运行安装程序"
    echo [REBOOT] Docker 安装完成，系统需要重启 >> "%STATUS_FILE%"
    exit /b 0
)

:: ============================================================
:: [2/3] 确保 Docker 引擎运行
:: ============================================================
call :log_step "[2/3] 检查 Docker 引擎状态..."
docker info >nul 2>&1
if !errorlevel! neq 0 (
    call :log_info "Docker 引擎未运行，尝试自动启动..."
    set "DOCKER_EXE="
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
    )
    if exist "C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe" (
        set "DOCKER_EXE=C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe"
    )
    if not defined DOCKER_EXE (
        call :log_fatal "找不到 Docker Desktop 可执行文件，请手动启动"
        exit /b 1
    )
    call :log_info "  启动 Docker Desktop: !DOCKER_EXE!"
    start "" "!DOCKER_EXE!"
    call :log_info "  等待 Docker 就绪（最多 120 秒）..."
    set /a WAIT=0
    :wait_loop
    timeout /t 5 >nul
    set /a WAIT+=5
    docker info >nul 2>&1
    if !errorlevel! equ 0 goto :docker_ready
    call :log_info "  已等待 !WAIT! 秒，Docker 引擎启动中..."
    if !WAIT! lss 120 goto :wait_loop
    call :log_fatal "Docker 启动超时（120秒），请手动启动后重试"
    exit /b 1
)
:docker_ready
call :log_info "Docker 引擎就绪"

:: ============================================================
:: [3/3] 生成配置并启动服务
:: ============================================================
call :log_step "[3/3] 启动 Docker Compose 服务..."

if not exist "%APP_DIR%\deploy\docker.env" (
    call :log_info "生成 docker.env 配置文件..."
    copy "%APP_DIR%\deploy\docker.env.example" "%APP_DIR%\deploy\docker.env" >nul
    call :log_info "  docker.env 已生成"
    call :log_warn "  请编辑 docker.env 修改密钥和密码！"
) else (
    call :log_skip "docker.env 已存在"
)

call :log_info "运行 docker compose up..."
pushd "%APP_DIR%"
:: 先停止旧容器（如果存在），确保干净启动
docker compose --env-file deploy\docker.env down >nul 2>&1
call :log_info "  旧容器已停止（如存在）"
docker compose --env-file deploy\docker.env up --build -d >> "%LOG_FILE%" 2>&1
set "DC_EC=!errorlevel!"
popd
call :log_info "  docker compose up 退出码: !DC_EC!"

if !DC_EC! neq 0 (
    pushd "%APP_DIR%"
    docker compose --env-file deploy\docker.env logs --tail=100 >> "%LOG_FILE%" 2>&1
    popd
    call :log_fatal "服务启动失败 (exitcode=!DC_EC!)，详见日志: %LOG_FILE%"
    exit /b 1
)

:: 等待服务就绪
call :log_info "  等待服务就绪（10秒）..."
timeout /t 10 >nul
for /f "tokens=*" %%r in ('curl -s -o nul -w "%%{http_code}" http://localhost:8080 2^>nul') do (
    call :log_info "  后端 HTTP 响应码: %%r"
)

call :log_info "========================================================"
call :log_info "  Docker 安装完成  %date% %time%"
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
