@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor - Docker 安装

:: 确保系统工具可用（PATH 可能被精简）
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"

set "LOG_FILE=%~dp0..\install.log"
set "APP_DIR=%~dp0.."

:: ============================================================
:: 初始化日志
:: ============================================================
echo. >> "%LOG_FILE%"
call :log_info "========================================================"
call :log_info "  Fertutor Docker 安装模式  开始"
call :log_info "  时间: %date% %time%"
call :log_info "  安装目录: %APP_DIR%"
call :log_info "  脚本路径: %~f0"
call :log_info "  当前用户: %USERNAME%"
call :log_info "  计算机名: %COMPUTERNAME%"
call :log_info "  系统版本: %OS%"
for /f "tokens=*" %%v in ('ver 2^>nul') do call :log_info "  Windows版本: %%v"
call :log_info "  处理器架构: %PROCESSOR_ARCHITECTURE%"
call :log_info "========================================================"
echo.

:: ============================================================
:: 环境预探测 → 估算安装时长
:: ============================================================
set "HAS_DOCKER=0"
docker --version >nul 2>&1 && set "HAS_DOCKER=1"

set "EST_SEC=180"
if "!HAS_DOCKER!"=="0" set /a EST_SEC+=900

call :log_info "[TIMEEST] !EST_SEC!"
call :log_info "  环境预探测: HAS_DOCKER=!HAS_DOCKER! 预估时长=!EST_SEC!秒"

:: ============================================================
:: [1/3] 检查/安装 Docker Desktop
:: ============================================================
call :log_step "[1/3] 检查 Docker Desktop..."
set "DOCKER_OK=0"
call :log_cmd "docker --version"
docker --version >nul 2>&1
set "DOCKER_CHECK_EC=!errorlevel!"
call :log_info "  docker --version 退出码: !DOCKER_CHECK_EC!"
if !DOCKER_CHECK_EC! equ 0 (
    set "DOCKER_OK=1"
    for /f "tokens=*" %%v in ('docker --version 2^>nul') do set "DOCKER_VER=%%v"
    for /f "tokens=*" %%p in ('where docker 2^>nul') do call :log_info "  docker 路径: %%p"
    call :log_skip "Docker 已安装: !DOCKER_VER!"
) else (
    call :log_info "Docker 未检测到，准备安装..."
    set "DOCKER_INSTALLER=%APP_DIR%\docker\Docker Desktop Installer.exe"
    call :log_info "  安装包路径: !DOCKER_INSTALLER!"
    if not exist "!DOCKER_INSTALLER!" (
        call :log_error "找不到 Docker Desktop 安装包: !DOCKER_INSTALLER!"
        call :log_info "  请下载: https://www.docker.com/products/docker-desktop/"
        exit /b 1
    )
    set "DOCKER_ARGS=install --quiet --accept-license --noreboot"
    if exist "%APP_DIR%\docker\docker.ini" (
        call :log_info "  读取 docker.ini 配置..."
        for /f "usebackq eol=; tokens=1,* delims==" %%a in ("%APP_DIR%\docker\docker.ini") do (
            if not "%%b"=="" if "%%a"=="mode" set "DOCKER_ARGS=install %%b"
        )
    )
    call :log_cmd "Docker Desktop Installer.exe !DOCKER_ARGS!"
    start /wait "" "!DOCKER_INSTALLER!" !DOCKER_ARGS! >> "%LOG_FILE%" 2>&1
    call :log_info "  Docker 安装程序退出码: !errorlevel!"
    call :log_info "Docker 安装完成，需要重启后生效"
    call :log_warn "重启后请重新运行安装程序"
    exit /b 0
)

:: ============================================================
:: [2/3] 确保 Docker 引擎运行
:: ============================================================
call :log_step "[2/3] 检查 Docker 引擎状态..."
call :log_cmd "docker info"
docker info >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    call :log_info "Docker 引擎未运行，尝试自动启动..."
    set "DOCKER_EXE="
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe"       set "DOCKER_EXE=C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if exist "C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe" set "DOCKER_EXE=C:\Program Files (x86)\Docker\Docker\Docker Desktop.exe"

    if defined DOCKER_EXE (
        call :log_info "  启动 Docker Desktop: !DOCKER_EXE!"
        start "" "!DOCKER_EXE!"
        call :log_info "  等待 Docker 就绪（最多 120 秒）..."
        set /a WAIT=0
        :wait_loop
        timeout /t 5 >nul
        set /a WAIT+=5
        docker info >nul 2>&1
        if !errorlevel! equ 0 goto :docker_ready
        call :log_info "  已等待 !WAIT! 秒..."
        if !WAIT! lss 120 goto :wait_loop
        call :log_error "Docker 启动超时（120秒），请手动启动后重试"
        exit /b 1
    ) else (
        call :log_error "找不到 Docker Desktop 可执行文件，请手动启动"
        exit /b 1
    )
)
:docker_ready
call :log_info "Docker 引擎就绪"
call :log_cmd "docker version"
docker version >> "%LOG_FILE%" 2>&1
call :log_cmd "docker info (摘要)"
docker info 2>&1 | findstr /i "Server Version Containers Images OSType" >> "%LOG_FILE%" 2>&1

:: ============================================================
:: [3/3] 生成配置并启动服务
:: ============================================================
call :log_step "[3/3] 启动 Docker Compose 服务..."

if not exist "%APP_DIR%\deploy\docker.env" (
    call :log_info "生成 docker.env 配置文件..."
    copy "%APP_DIR%\deploy\docker.env.example" "%APP_DIR%\deploy\docker.env" >nul
    call :log_info "  docker.env 已生成: %APP_DIR%\deploy\docker.env"
    call :log_warn "  请编辑 docker.env 修改密钥和密码！"
) else (
    call :log_skip "docker.env 已存在"
)

call :log_cmd "docker compose up --build -d"
pushd "%APP_DIR%"
docker compose --env-file deploy\docker.env up --build -d >> "%LOG_FILE%" 2>&1
set "DC_EC=!errorlevel!"
popd
call :log_info "  docker compose up 退出码: !DC_EC!"

if !DC_EC! neq 0 (
    call :log_error "服务启动失败 (exitcode=!DC_EC!)，收集容器日志..."
    call :log_cmd "docker compose logs --tail=100"
    pushd "%APP_DIR%"
    docker compose --env-file deploy\docker.env logs --tail=100 >> "%LOG_FILE%" 2>&1
    popd
    call :log_error "详细日志已写入: %LOG_FILE%"
    exit /b 1
)

:: 记录运行中的容器状态
call :log_cmd "docker compose ps"
pushd "%APP_DIR%"
docker compose --env-file deploy\docker.env ps >> "%LOG_FILE%" 2>&1
call :log_info "  --- 容器日志（最近50行）---"
docker compose --env-file deploy\docker.env logs --tail=50 >> "%LOG_FILE%" 2>&1
popd

:: 等待服务就绪并测试
call :log_info "  等待服务就绪（10秒）..."
timeout /t 10 >nul
call :log_cmd "curl http://localhost:8080 (健康检查)"
for /f "tokens=*" %%r in ('curl -s -o nul -w "%%{http_code}" http://localhost:8080 2^>nul') do (
    call :log_info "  后端 HTTP 响应码: %%r"
)

call :log_info "========================================================"
call :log_info "  Docker 安装完成  %date% %time%"
call :log_info "  日志文件: %LOG_FILE%"
call :log_info "========================================================"

echo.
echo =========================================
echo   安装完成！
echo   前端: http://localhost:5173
echo   后端: http://localhost:8080
echo   停止: docker compose --env-file deploy\docker.env down
echo   安装日志: %LOG_FILE%
echo =========================================
echo.
timeout /t 3 >nul
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
