@echo off
chcp 65001 >nul 2>&1
title Fertutor 安装程序
setlocal enabledelayedexpansion

:: 切换到脚本目录
cd /d "%~dp0"

:: 日志初始化
set "LOG_FILE=%~dp0install.log"
echo ======================================== >> "%LOG_FILE%"
echo [%date% %time%] ======================================== >> "%LOG_FILE%"
echo [%date% %time%] 程序启动 v1.3.6 >> "%LOG_FILE%"
echo [%date% %time%] ======================================== >> "%LOG_FILE%"

:: 记录系统信息
echo [%date% %time%] [系统信息] >> "%LOG_FILE%"
echo [%date% %time%]   计算机名: %COMPUTERNAME% >> "%LOG_FILE%"
echo [%date% %time%]   用户名: %USERNAME% >> "%LOG_FILE%"
echo [%date% %time%]   OS版本: %OS% >> "%LOG_FILE%"
echo [%date% %time%]   处理器架构: %PROCESSOR_ARCHITECTURE% >> "%LOG_FILE%"
echo [%date% %time%]   程序路径: %~dp0 >> "%LOG_FILE%"
echo [%date% %time%]   工作目录: %CD% >> "%LOG_FILE%"
echo [%date% %time%]   当前时间: %date% %time% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: 日志函数
goto :main

:log
echo [%date% %time%] %~1 >> "%LOG_FILE%"
goto :eof

:log_error
echo [错误] %~1
echo [%date% %time%] [错误] %~1 >> "%LOG_FILE%"
goto :eof

:log_info
echo %~1
echo [%date% %time%] %~1 >> "%LOG_FILE%"
goto :eof

:log_detail
echo [%date% %time%]   %~1 >> "%LOG_FILE%"
goto :eof

:main

:menu
cls
echo.
echo ================================================
echo         Fertutor 安装程序 v1.3.6
echo ================================================
echo.
echo   [1] 虚拟机镜像方案
echo       - 需要 Packer + Windows 11 ISO
echo       - 构建完整的虚拟机镜像
echo.
echo   [2] Docker 便携版 (推荐)
echo       - 自动安装 Docker Desktop + PostgreSQL
echo       - 自动导入数据库
echo       - 自动启动服务
echo.
echo   [3] Docker 容器 (已有Docker)
echo       - 已有 Docker Desktop
echo       - 自动安装 PostgreSQL + 导入数据库
echo       - 自动启动服务
echo.
echo   [4] 仅安装 PostgreSQL + 导入数据库
echo       - 已有 Docker
echo       - 仅安装 PostgreSQL + 导入数据库
echo.
echo.
echo ================================================
echo.

set /p choice=请选择 [0-4]:

if "!choice!"=="1" goto option1
if "!choice!"=="2" goto option2
if "!choice!"=="3" goto option3
if "!choice!"=="4" goto option4
if "!choice!"=="0" exit

echo 无效选择，请重试
timeout /t 2 >nul
goto menu

:option1
cls
echo.
echo ================================================
echo   虚拟机镜像方案
echo ================================================
echo.
echo 此方案需要额外工具:
echo   - Packer (HashiCorp)
echo   - Windows 11 ISO
echo.
echo 请参考文档
echo.
pause
goto menu

:option2
cls
call :log_info "=== 选择选项2: Docker 便携版 ==="
call :log_detail "开始完整安装流程..."
echo.
echo ================================================
echo   Docker 便携版安装
echo ================================================
echo.

:: 检查/安装 7-Zip (无人安装)
call :log_info "[1/5] 检查 7-Zip..."
call :log_detail "检查安装路径..."
call :log_detail "开始检查 7-Zip..."
set "SEVENZIP_INSTALLED=0"
call :log_detail "变量已初始化"
if exist "C:\Program Files\7-Zip\7z.exe" (
    set "SEVENZIP_INSTALLED=1"
    call :log_detail "找到: C:\Program Files\7-Zip\7z.exe"
)
call :log_detail "第1次检查完成: SEVENZIP_INSTALLED=!SEVENZIP_INSTALLED!"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" (
    set "SEVENZIP_INSTALLED=1"
    call :log_detail "找到: C:\Program Files (x86)\7-Zip\7z.exe"
)
call :log_detail "第2次检查完成: SEVENZIP_INSTALLED=!SEVENZIP_INSTALLED!"
if exist "C:\7-Zip\7z.exe" (
    set "SEVENZIP_INSTALLED=1"
    call :log_detail "找到: C:\7-Zip\7z.exe"
)
call :log_detail "第3次检查完成: SEVENZIP_INSTALLED=!SEVENZIP_INSTALLED!"
call :log_detail "检查安装包路径: %~dp0docker\7z2501-x64.exe"
set "INSTALLER_PATH=%~dp0docker\7z2501-x64.exe"
call :log_detail "检查安装包: !INSTALLER_PATH!"
if "!SEVENZIP_INSTALLED!"=="1" (
    call :log_info "[跳过] 7-Zip 已安装"
    call :log_detail "找到的安装路径请查看上方记录"
)
if "!SEVENZIP_INSTALLED!"=="1" goto :skip_7z_install
call :log_detail "进入安装判断..."
call :log_detail "检查文件是否存在..."
cmd /c "if exist "%~dp0docker\7z2501-x64.exe" exit /b 0"
if !errorlevel! neq 0 goto :no_7z_installer
call :log_detail "安装包存在，准备安装..."
call :log_info "正在安装 7-Zip (静默安装)..."
call :log_detail "安装包: %~dp0docker\7z2501-x64.exe"

:: 读取 7-Zip 配置文件
set "7Z_ARGS=/S"
set "7Z_PATH=C:\Program Files (x86)\7-Zip"

cmd /c "if exist "%~dp0docker\7z.ini" exit /b 0"
if !errorlevel! equ 0 goto :read_7z_ini
goto :skip_7z_ini
:read_7z_ini
call :log_detail "读取配置文件: %~dp0docker\7z.ini"
for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\7z.ini") do (
    set "key=%%a"
    set "val=%%b"
    if "!key!"=="silent" set "7Z_ARGS=!val!"
    if "!key!"=="installpath" set "7Z_PATH=!val!"
)
:skip_7z_ini

call :log_info "7-Zip 安装参数: !7Z_ARGS! /D=!7Z_PATH!"
call :log_detail "完整路径: %~dp0docker\7z2501-x64.exe"
echo [%date% %time%]   安装命令: %~dp0docker\7z2501-x64.exe !7Z_ARGS! /D=!7Z_PATH! >> "%LOG_FILE%"

start /wait "" "%~dp0docker\7z2501-x64.exe" !7Z_ARGS! /D=!7Z_PATH!

:: 7-Zip 即使安装成功也可能返回退出码1，改用检查文件是否存在
call :log_info "检查 7-Zip 安装结果..."
cmd /c "if exist "C:\Program Files (x86)\7-Zip\7z.exe" exit /b 0"
if !errorlevel! equ 0 goto :7z_install_ok_1
cmd /c "if exist "C:\Program Files\7-Zip\7z.exe" exit /b 0"
if !errorlevel! equ 0 goto :7z_install_ok_2
cmd /c "if exist "C:\7-Zip\7z.exe" exit /b 0"
if !errorlevel! equ 0 goto :7z_install_ok_3
goto :7z_install_failed

:7z_install_ok_1
call :log_info "7-Zip 安装完成"
call :log_detail "安装路径: C:\Program Files (x86)\7-Zip"
goto :7z_install_done

:7z_install_ok_2
call :log_info "7-Zip 安装完成"
call :log_detail "安装路径: C:\Program Files\7-Zip"
goto :7z_install_done

:7z_install_ok_3
call :log_info "7-Zip 安装完成"
call :log_detail "安装路径: C:\7-Zip"
goto :7z_install_done

:7z_install_failed

call :log_error "7-Zip 安装失败 - 未找到安装文件"
call :log_info "安装终止，是否继续安装其他软件?"
echo.
echo   [1] 继续安装其他软件
echo   [2] 退出安装程序
echo.
set /p FAIL_CHOICE=请选择 [1-2]:
if not defined FAIL_CHOICE set "FAIL_CHOICE=1"
if "!FAIL_CHOICE!"=="2" (
    call :log_info "用户选择退出安装程序"
    exit /b 1
)
call :log_info "用户选择继续安装"
goto :7z_install_done

:no_7z_installer
call :log_error "找不到 7z2501-x64.exe"

:7z_install_done

:: 检查/安装 Docker (无人安装)
echo.
call :log_info "[2/5] 检查 Docker..."
call :log_detail "执行命令: docker --version"
docker --version >nul 2>&1
if !errorlevel! equ 0 goto :docker_already_installed
goto :check_docker_installer
:docker_already_installed
call :log_info "[跳过] Docker 已安装"
call :log_detail "Docker 已安装，将跳过Docker安装步骤"
goto install_postgresql_option2
:check_docker_installer

cmd /c "if exist "%~dp0docker\Docker Desktop Installer.exe" exit /b 0"
if !errorlevel! equ 0 goto :do_docker_install
goto :no_docker_installer
:do_docker_install
call :log_info "正在安装 Docker Desktop (无人值守模式)..."
call :log_detail "安装包: %~dp0docker\Docker Desktop Installer.exe"

:: 读取 Docker 配置文件
set "DOCKER_ARGS=install --quiet --accept-license --noreboot"

cmd /c "if exist "%~dp0docker\docker.ini" exit /b 0"
if !errorlevel! equ 0 goto :read_docker_ini
goto :skip_docker_ini
:read_docker_ini
call :log_detail "读取配置文件: %~dp0docker\docker.ini"
for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\docker.ini") do (
    set "key=%%a"
    set "val=%%b"
    if "!key!"=="mode" set "DOCKER_ARGS=install !val!"
    if "!key!"=="noreboot" (
        if "!val!"=="false" set "DOCKER_ARGS=install --quiet --accept-license"
    )
)
:skip_docker_ini

    call :log_info "Docker 安装参数: !DOCKER_ARGS!"
    echo [%date% %time%]   安装命令: "%~dp0docker\Docker Desktop Installer.exe" !DOCKER_ARGS! >> "%LOG_FILE%"

    start /wait "" "%~dp0docker\Docker Desktop Installer.exe" !DOCKER_ARGS!

    :: 检查 Docker 是否安装成功
    call :log_info "检查 Docker 安装结果..."
    docker --version >nul 2>&1
    if !errorlevel! equ 0 goto :docker_install_ok
    call :log_error "Docker 安装失败"
    call :log_info "可能原因: WSL2/Hyper-V 未启用，请手动安装"
    call :log_info "安装终止，是否继续安装其他软件?"
    echo.
    echo   [1] 继续安装其他软件
    echo   [2] 退出安装程序
    echo.
    set /p FAIL_CHOICE=请选择 [1-2]:
    if not defined FAIL_CHOICE set "FAIL_CHOICE=1"
    if "!FAIL_CHOICE!"=="2" (
        call :log_info "用户选择退出安装程序"
        exit /b 1
    )
    call :log_info "用户选择继续安装"
    goto install_postgresql_option2
    :docker_install_ok
    call :log_info "Docker 安装完成"
    call :log_detail "安装路径: C:\Program Files\Docker\Docker"
    goto install_postgresql_option2
    :no_docker_installer
    call :log_error "找不到 Docker Desktop Installer.exe"
    pause
    goto menu

:install_postgresql_option2
:: 检查/安装 PostgreSQL (无人安装)
echo.
call :log_info "[3/5] 检查 PostgreSQL..."
call :log_detail "检查注册表: HKLM\SOFTWARE\PostgreSQL"
call :log_detail "执行注册表检查..."
reg query "HKLM\SOFTWARE\PostgreSQL" /s >nul 2>&1
call :log_detail "注册表检查完成"
if !errorlevel! equ 0 goto :pg_already_installed
goto :check_pg_installer
:pg_already_installed
call :log_info "[跳过] PostgreSQL 已安装"
call :log_detail "PostgreSQL 已注册到系统"
:: 初始化 PostgreSQL 变量（跳过安装时需要手动设置）
set "PG_SUPERACCOUNT=postgres"
set "PG_SUPERPASSWORD=postgres123"
set "PG_PORT=5432"
if exist "%~dp0docker\postgresql.ini" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\postgresql.ini") do (
        set "key=%%a"
        set "val=%%b"
        if "!key!"=="superaccount" set "PG_SUPERACCOUNT=!val!"
        if "!key!"=="superpassword" set "PG_SUPERPASSWORD=!val!"
        if "!key!"=="password" set "PG_SUPERPASSWORD=!val!"
        if "!key!"=="port" set "PG_PORT=!val!"
    )
)
call :log_detail "  超级用户: !PG_SUPERACCOUNT! 端口: !PG_PORT!"
goto :import_database_option2
:check_pg_installer

call :log_detail "检查 PostgreSQL 安装包..."
set "PG_INSTALLER=%~dp0docker\postgresql-16.13-2-windows-x64.exe"
call :log_detail "安装包路径: !PG_INSTALLER!"
call :log_detail "执行文件检查..."
cmd /c "if exist %~dp0docker\postgresql-16.13-2-windows-x64.exe exit /b 0"
call :log_detail "文件检查完成，errorlevel=!errorlevel!"
if !errorlevel! neq 0 goto :no_pg_installer
call :log_info "正在安装 PostgreSQL (静默安装)..."
call :log_detail "安装包: %~dp0docker\postgresql-16.13-2-windows-x64.exe"

:: 读取配置文件
set "PG_SUPERACCOUNT=postgres"
set "PG_SUPERPASSWORD=postgres123"
set "PG_SERVICEACCOUNT=postgres"
set "PG_SERVICENAME=postgresql-x64-16"
set "PG_PORT=5432"

cmd /c "if exist "%~dp0docker\postgresql.ini" exit /b 0"
if !errorlevel! equ 0 goto :read_pg_ini
goto :skip_pg_ini
:read_pg_ini
call :log_detail "读取配置文件: %~dp0docker\postgresql.ini"
for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\postgresql.ini") do (
    set "key=%%a"
    set "val=%%b"
    if "!key!"=="superaccount" set "PG_SUPERACCOUNT=!val!"
    if "!key!"=="superpassword" set "PG_SUPERPASSWORD=!val!"
    if "!key!"=="serviceaccount" set "PG_SERVICEACCOUNT=!val!"
    if "!key!"=="servicename" set "PG_SERVICENAME=!val!"
    if "!key!"=="password" set "PG_SUPERPASSWORD=!val!"
    if "!key!"=="port" set "PG_PORT=!val!"
)
:skip_pg_ini

call :log_info "PostgreSQL 安装参数:"
call :log_detail "  超级用户: !PG_SUPERACCOUNT!"
call :log_detail "  超级密码: ***"
call :log_detail "  服务账户: !PG_SERVICEACCOUNT!"
call :log_detail "  服务名称: !PG_SERVICENAME!"
call :log_detail "  端口: !PG_PORT!"
call :log_detail "  安装路径: C:\Program Files\PostgreSQL\16"

echo [%date% %time%]   安装命令: %~dp0docker\postgresql-16.13-2-windows-x64.exe --unattendedmodeui none --mode unattended --superaccount !PG_SUPERACCOUNT! --superpassword *** --serviceaccount !PG_SERVICEACCOUNT! --servicename !PG_SERVICENAME! >> "%LOG_FILE%"

start /wait "" "%~dp0docker\postgresql-16.13-2-windows-x64.exe" --unattendedmodeui none --mode unattended --superaccount !PG_SUPERACCOUNT! --superpassword !PG_SUPERPASSWORD! --serviceaccount !PG_SERVICEACCOUNT! --servicename !PG_SERVICENAME!
set "PG_EXITCODE=!errorlevel!"
echo [%date% %time%]   PostgreSQL 安装退出码: !PG_EXITCODE! >> "%LOG_FILE%"

if !PG_EXITCODE! equ 0 goto :pg_install_ok
call :log_error "PostgreSQL 安装失败 (退出码: !PG_EXITCODE!)"
call :log_info "安装终止，是否继续导入数据库?"
echo.
echo   [1] 继续尝试导入数据库
echo   [2] 退出安装程序
echo.
set /p FAIL_CHOICE=请选择 [1-2]:
if not defined FAIL_CHOICE set "FAIL_CHOICE=1"
if "!FAIL_CHOICE!"=="2" (
    call :log_info "用户选择退出安装程序"
    exit /b 1
)
call :log_info "用户选择继续导入数据库"
goto :import_database_option2

:pg_install_ok
call :log_info "PostgreSQL 安装完成"
call :log_detail "安装路径: C:\Program Files\PostgreSQL\16"
goto :import_database_option2

:no_pg_installer
call :log_error "找不到 postgresql 安装包"

:import_database_option2
:: 导入数据库 SQL 文件
echo.
call :log_info "[4/5] 导入数据库..."
call :log_detail "等待 PostgreSQL 服务启动..."
timeout /t 5 >nul

:: 设置 psql 路径
set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
if not exist "!PSQL_PATH!" set "PSQL_PATH=C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe"
call :log_detail "psql 路径: !PSQL_PATH!"
echo [%date% %time%]   psql 路径: !PSQL_PATH! >> "%LOG_FILE%"

if exist "!PSQL_PATH!" (
    :: 设置密码环境变量（免交互），如果未设置则使用默认值
    if not defined PG_SUPERPASSWORD set "PG_SUPERPASSWORD=postgres123"
    if not defined PG_SUPERACCOUNT set "PG_SUPERACCOUNT=postgres"
    if not defined PG_PORT set "PG_PORT=5432"
    set "PGPASSWORD=!PG_SUPERPASSWORD!"
    set "PGUSER=!PG_SUPERACCOUNT!"

    :: 创建数据库 (如果不存在)
    call :log_info "创建数据库 fertutor..."
    "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -c "CREATE DATABASE fertutor;" 2>> "%LOG_FILE%"
    call :log_detail "数据库: fertutor"

    :: 导入 SQL 文件
    if exist "%~dp0app\server\baze\baze.sql" (
        call :log_info "导入 baze.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\baze.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\migration_admin.sql" (
        call :log_info "导入 migration_admin.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\migration_admin.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\testingData.sql" (
        call :log_info "导入 testingData.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\testingData.sql" 2>> "%LOG_FILE%"
    )

    :: 导入 migrations 目录中的文件
    if exist "%~dp0app\server\baze\migrations" (
        call :log_detail "扫描 migrations 目录..."
        for %%f in ("%~dp0app\server\baze\migrations\*.sql") do (
            call :log_info "导入 %%~nf.sql..."
            "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%%f" 2>> "%LOG_FILE%"
        )
    )

    call :log_info "数据库导入完成"
    call :log_detail "数据库名: fertutor 用户: !PGUSER! 端口: !PG_PORT!"
) else (
    call :log_error "找不到 psql.exe"
)

:start_services_portable_option2
:: 启动服务
echo.
call :log_info "[5/5] 启动服务..."
call :log_detail "执行 start.bat..."
call start.bat
echo.
echo ========================================
echo   服务已启动!
echo   前端: http://localhost:5173
echo   后端: http://localhost:8080
echo ========================================
echo.
call :log_info "安装完成!"
call :log_info "日志文件: %LOG_FILE%"
timeout /t 5 >nul
start http://localhost:5173
pause
goto menu

:option3
cls
call :log_info "=== 选择选项3: Docker 容器 ==="
call :log_detail "已有Docker，仅安装PostgreSQL + 数据库..."
echo.
echo ================================================
echo   Docker 容器方案 (已有Docker)
echo ================================================
echo.

:: 检查 Docker
call :log_info "[1/3] 检查 Docker..."
docker --version >nul 2>&1
if !errorlevel! neq 0 goto :no_docker_msg3
goto :docker_ok_3
:no_docker_msg3
call :log_error "Docker 未安装，请使用选项2安装 Docker"
pause
goto menu
:docker_ok_3
call :log_info "[跳过] Docker 已安装"
call :log_detail "Docker 已安装"

:: 检查/安装 PostgreSQL (无人安装)
echo.
call :log_info "[2/3] 检查 PostgreSQL..."
reg query "HKLM\SOFTWARE\PostgreSQL" /s >nul 2>&1
if !errorlevel! equ 0 goto :pg_skip_3
goto :pg_check_3
:pg_skip_3
call :log_info "[跳过] PostgreSQL 已安装"
goto import_database_option3
:pg_check_3

if exist "%~dp0docker\postgresql-16.13-2-windows-x64.exe" (
    call :log_info "正在安装 PostgreSQL (静默安装)..."

    :: 读取配置文件
    set "PG_SUPERACCOUNT=postgres"
    set "PG_SUPERPASSWORD=postgres123"
    set "PG_SERVICEACCOUNT=postgres"
    set "PG_SERVICENAME=postgresql-x64-16"
    set "PG_PORT=5432"

    if exist "%~dp0docker\postgresql.ini" (
        for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\postgresql.ini") do (
            set "key=%%a"
            set "val=%%b"
            if "!key!"=="superaccount" set "PG_SUPERACCOUNT=!val!"
            if "!key!"=="superpassword" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="serviceaccount" set "PG_SERVICEACCOUNT=!val!"
            if "!key!"=="servicename" set "PG_SERVICENAME=!val!"
            if "!key!"=="password" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="port" set "PG_PORT=!val!"
        )
    )

    call :log_info "PostgreSQL 安装参数:"
    call :log_detail "  服务名称: !PG_SERVICENAME! 端口: !PG_PORT!"

    echo [%date% %time%]   安装命令: postgresql-16.13-2-windows-x64.exe --unattendedmodeui none --mode unattended --superaccount !PG_SUPERACCOUNT! --superpassword *** --serviceaccount !PG_SERVICEACCOUNT! --servicename !PG_SERVICENAME! >> "%LOG_FILE%"

    start /wait "" "%~dp0docker\postgresql-16.13-2-windows-x64.exe" --unattendedmodeui none --mode unattended --superaccount !PG_SUPERACCOUNT! --superpassword !PG_SUPERPASSWORD! --serviceaccount !PG_SERVICEACCOUNT! --servicename !PG_SERVICENAME!
    set "PG_EXITCODE=!errorlevel!"
    echo [%date% %time%]   PostgreSQL 安装退出码: !PG_EXITCODE! >> "%LOG_FILE%"

    if !PG_EXITCODE! equ 0 (
        call :log_info "PostgreSQL 安装完成"
    ) else (
        call :log_error "PostgreSQL 安装失败 (退出码: !PG_EXITCODE!)"
        call :log_info "安装终止，是否继续导入数据库?"
        echo.
        echo   [1] 继续尝试导入数据库
        echo   [2] 退出安装程序
        echo.
        set /p FAIL_CHOICE=请选择 [1-2]:
        if not defined FAIL_CHOICE set "FAIL_CHOICE=1"
        if "!FAIL_CHOICE!"=="2" (
            call :log_info "用户选择退出安装程序"
            exit /b 1
        )
        call :log_info "用户选择继续导入数据库"
    )
) else (
    call :log_error "找不到 postgresql 安装包"
)

:import_database_option3
:: 导入数据库 SQL 文件
echo.
call :log_info "[3/3] 导入数据库..."

:: 等待 PostgreSQL 服务启动
timeout /t 5 >nul

:: 设置 psql 路径
set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
if not exist "!PSQL_PATH!" set "PSQL_PATH=C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe"
call :log_detail "psql 路径: !PSQL_PATH!"

if exist "!PSQL_PATH!" (
    :: 设置密码环境变量（免交互），如果未设置则使用默认值
    if not defined PG_SUPERPASSWORD set "PG_SUPERPASSWORD=postgres123"
    if not defined PG_SUPERACCOUNT set "PG_SUPERACCOUNT=postgres"
    if not defined PG_PORT set "PG_PORT=5432"
    set "PGPASSWORD=!PG_SUPERPASSWORD!"
    set "PGUSER=!PG_SUPERACCOUNT!"

    :: 创建数据库 (如果不存在)
    call :log_info "创建数据库 fertutor..."
    "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -c "CREATE DATABASE fertutor;" 2>> "%LOG_FILE%"

    :: 导入 SQL 文件
    if exist "%~dp0app\server\baze\baze.sql" (
        call :log_info "导入 baze.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\baze.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\migration_admin.sql" (
        call :log_info "导入 migration_admin.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\migration_admin.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\testingData.sql" (
        call :log_info "导入 testingData.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\testingData.sql" 2>> "%LOG_FILE%"
    )

    :: 导入 migrations 目录中的文件
    if exist "%~dp0app\server\baze\migrations" (
        for %%f in ("%~dp0app\server\baze\migrations\*.sql") do (
            call :log_info "导入 %%~nf.sql..."
            "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%%f" 2>> "%LOG_FILE%"
        )
    )

    call :log_info "数据库导入完成"
) else (
    call :log_error "找不到 psql.exe，请手动导入数据库"
)

:: 启动服务
echo.
call :log_info "启动服务..."
call start.bat
echo.
echo ========================================
echo   服务已启动!
echo   前端: http://localhost:5173
echo   后端: http://localhost:8080
echo ========================================
echo.
call :log_info "完成!"
call :log_info "日志文件: %LOG_FILE%"
timeout /t 5 >nul
start http://localhost:5173
pause
goto menu

:option4
cls
call :log_info "=== 选择选项4: 仅安装 PostgreSQL + 导入数据库 ==="
call :log_detail "仅安装PostgreSQL + 数据库..."
echo.
echo ================================================
echo   仅安装 PostgreSQL + 导入数据库
echo ================================================
echo.

:: 检查 Docker
call :log_info "[1/2] 检查 Docker..."
docker --version >nul 2>&1
if !errorlevel! neq 0 goto :no_docker_err4
goto :docker_ok_4
:no_docker_err4
call :log_error "Docker 未安装，请先安装 Docker Desktop"
pause
goto menu
:docker_ok_4
call :log_info "[跳过] Docker 已安装"
call :log_detail "Docker 已安装"

:: 检查/安装 PostgreSQL (无人安装)
echo.
call :log_info "[2/2] 检查 PostgreSQL..."
reg query "HKLM\SOFTWARE\PostgreSQL" /s >nul 2>&1
if !errorlevel! equ 0 goto :pg_skip_4
goto :pg_check_4
:pg_skip_4
call :log_info "[跳过] PostgreSQL 已安装"
goto import_database_option4
:pg_check_4

if exist "%~dp0docker\postgresql-16.13-2-windows-x64.exe" ( 
    call :log_info "正在安装 PostgreSQL (静默安装)..."

    :: 读取配置文件
    set "PG_SUPERACCOUNT=postgres"
    set "PG_SUPERPASSWORD=postgres123"
    set "PG_SERVICEACCOUNT=postgres"
    set "PG_SERVICENAME=postgresql-x64-16"
    set "PG_PORT=5432"

    if exist "%~dp0docker\postgresql.ini" (
        for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\postgresql.ini") do (
            set "key=%%a"
            set "val=%%b"
            if "!key!"=="superaccount" set "PG_SUPERACCOUNT=!val!"
            if "!key!"=="superpassword" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="serviceaccount" set "PG_SERVICEACCOUNT=!val!"
            if "!key!"=="servicename" set "PG_SERVICENAME=!val!"
            if "!key!"=="password" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="port" set "PG_PORT=!val!"
        )
    )

    call :log_info "PostgreSQL 安装参数:"
    call :log_detail "  服务名称: !PG_SERVICENAME! 端口: !PG_PORT!"

    start /wait "" "%~dp0docker\postgresql-16.13-2-windows-x64.exe" --unattendedmodeui none --mode unattended --superaccount !PG_SUPERACCOUNT! --superpassword !PG_SUPERPASSWORD! --serviceaccount !PG_SERVICEACCOUNT! --servicename !PG_SERVICENAME!
    set "PG_EXITCODE=!errorlevel!"
    echo [%date% %time%]   PostgreSQL 安装退出码: !PG_EXITCODE! >> "%LOG_FILE%"

    if !PG_EXITCODE! equ 0 (
        call :log_info "PostgreSQL 安装完成"
    ) else (
        call :log_error "PostgreSQL 安装失败 (退出码: !PG_EXITCODE!)"
        call :log_info "安装终止，是否继续导入数据库?"
        echo.
        echo   [1] 继续尝试导入数据库
        echo   [2] 退出安装程序
        echo.
        set /p FAIL_CHOICE=请选择 [1-2]:
        if not defined FAIL_CHOICE set "FAIL_CHOICE=1"
        if "!FAIL_CHOICE!"=="2" (
            call :log_info "用户选择退出安装程序"
            exit /b 1
        )
        call :log_info "用户选择继续导入数据库"
    )
) else (
    call :log_error "找不到 postgresql 安装包"
    pause
    goto menu
)

:import_database_option4
:: 导入数据库 SQL 文件
echo.
call :log_info "导入数据库..."

:: 等待 PostgreSQL 服务启动
timeout /t 5 >nul

:: 设置 psql 路径
set "PSQL_PATH=C:\Program Files\PostgreSQL\16\bin\psql.exe"
if not exist "!PSQL_PATH!" set "PSQL_PATH=C:\Program Files (x86)\PostgreSQL\16\bin\psql.exe"
call :log_detail "psql 路径: !PSQL_PATH!"

if exist "!PSQL_PATH!" (
    :: 设置默认PostgreSQL变量
    set "PG_SUPERACCOUNT=postgres"
    set "PG_SUPERPASSWORD=postgres123"
    set "PG_PORT=5432"

    if exist "%~dp0docker\postgresql.ini" (
        for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0docker\postgresql.ini") do (
            set "key=%%a"
            set "val=%%b"
            if "!key!"=="superaccount" set "PG_SUPERACCOUNT=!val!"
            if "!key!"=="superpassword" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="password" set "PG_SUPERPASSWORD=!val!"
            if "!key!"=="port" set "PG_PORT=!val!"
        )
    )

    :: 设置密码环境变量（免交互），如果未设置则使用默认值
    if not defined PG_SUPERPASSWORD set "PG_SUPERPASSWORD=postgres123"
    if not defined PG_SUPERACCOUNT set "PG_SUPERACCOUNT=postgres"
    set "PGPASSWORD=!PG_SUPERPASSWORD!"
    set "PGUSER=!PG_SUPERACCOUNT!"

    :: 创建数据库 (如果不存在)
    call :log_info "创建数据库 fertutor..."
    "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -c "CREATE DATABASE fertutor;" 2>> "%LOG_FILE%"

    :: 导入 SQL 文件
    if exist "%~dp0app\server\baze\baze.sql" (
        call :log_info "导入 baze.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\baze.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\migration_admin.sql" (
        call :log_info "导入 migration_admin.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\migration_admin.sql" 2>> "%LOG_FILE%"
    )

    if exist "%~dp0app\server\baze\testingData.sql" (
        call :log_info "导入 testingData.sql..."
        "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%~dp0app\server\baze\testingData.sql" 2>> "%LOG_FILE%"
    )

    :: 导入 migrations 目录中的文件
    if exist "%~dp0app\server\baze\migrations" (
        for %%f in ("%~dp0app\server\baze\migrations\*.sql") do (
            call :log_info "导入 %%~nf.sql..."
            "!PSQL_PATH!" -U !PGUSER! -p !PG_PORT! -d fertutor -f "%%f" 2>> "%LOG_FILE%"
        )
    )

    call :log_info "数据库导入完成"
) else (
    call :log_error "找不到 psql.exe，请手动导入数据库"
    call :log_info "提示: PostgreSQL 可能未正确安装"
    pause
    goto menu
)

:: 启动服务
echo.
call :log_info "启动服务..."
call start.bat
echo.
echo ========================================
echo   服务已启动!
echo   前端: http://localhost:5173
echo   后端: http://localhost:8080
echo ========================================
echo.
call :log_info "完成!"
call :log_info "日志文件: %LOG_FILE%"
timeout /t 5 >nul
start http://localhost:5173
pause
goto menu