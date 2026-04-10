@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor - 卸载

:: 确保系统工具可用
set "PATH=C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem;%PATH%"

set "LOG_FILE=%~dp0..\install.log"
set "NSSM=%~dp0..\tools\nssm.exe"
set "SERVICE_NAME=Fertutor"

echo. >> "%LOG_FILE%"
call :log_info "========================================================"
call :log_info "  Fertutor 卸载程序  开始"
call :log_info "  时间: %date% %time%"
call :log_info "  调用参数: %*"
call :log_info "========================================================"

:: 支持静默模式（Inno Setup 卸载时传 /silent 参数）
set "SILENT=0"
for %%a in (%*) do (
    if /i "%%a"=="/silent" set "SILENT=1"
    if /i "%%a"=="-silent" set "SILENT=1"
)
call :log_info "  静默模式: !SILENT!"

if "!SILENT!"=="0" (
    echo.
    echo =========================================
    echo   Fertutor 卸载程序
    echo =========================================
    echo.
    echo 这将停止并删除 Fertutor 服务。
    echo 数据库数据不会被删除。
    echo.
    set /p CONFIRM=确认卸载? [y/N]: 
    if /i not "!CONFIRM!"=="y" (
        call :log_info "用户取消卸载"
        exit /b 0
    )
)

call :log_info "开始执行卸载..."

:: 停止并删除服务（无条件执行，忽略错误）
call :log_info "停止服务: !SERVICE_NAME!"
"!NSSM!" stop "!SERVICE_NAME!" >nul 2>&1
call :log_info "  nssm stop 退出码: !errorlevel!"
ping 127.0.0.1 -n 3 >nul

call :log_info "删除服务: !SERVICE_NAME!"
"!NSSM!" remove "!SERVICE_NAME!" confirm >nul 2>&1
call :log_info "  nssm remove 退出码: !errorlevel!"

:: 兜底：用 sc delete 确保删干净
sc stop "!SERVICE_NAME!" >nul 2>&1
sc delete "!SERVICE_NAME!" >nul 2>&1
call :log_info "  sc delete 退出码: !errorlevel!"

:: ============================================================
:: 删除数据库
:: ============================================================
call :log_info "查找 psql 路径..."
set "PSQL_PATH="
for %%v in (17 16 15 14) do (
    if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
        if "!PSQL_PATH!"=="" set "PSQL_PATH=C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
    )
)
if "!PSQL_PATH!"=="" (
    for /f "tokens=*" %%p in ('where psql 2^>nul') do (
        if "!PSQL_PATH!"=="" set "PSQL_PATH=%%p"
    )
)
call :log_info "  psql 路径: !PSQL_PATH!"

if "!PSQL_PATH!"=="" (
    call :log_info "  未找到 psql，跳过数据库删除"
    echo [%date% %time%] [WARN] 未找到 PostgreSQL，数据库未删除，请手动删除 fertutor 数据库 >> "%LOG_FILE%"
    mshta "javascript:var sh=new ActiveXObject('WScript.Shell');sh.Popup('未找到 PostgreSQL，fertutor 数据库未删除。\n请手动打开 pgAdmin 或 psql 删除 fertutor 数据库。',0,'Fertutor 卸载提示',48);close()"
    goto :skip_db
)

:: 读取数据库连接参数（从 .env 文件）
set "PG_USER=postgres"
set "PG_PORT=5432"
set "PG_PASS=postgres123"
set "ENV_FILE=%~dp0..\app\server\.env"
if exist "!ENV_FILE!" (
    for /f "usebackq eol=# tokens=1,* delims==" %%a in ("!ENV_FILE!") do (
        if "%%a"=="DB_USER"     set "PG_USER=%%b"
        if "%%a"=="DB_PORT"     set "PG_PORT=%%b"
        if "%%a"=="DB_PASSWORD" set "PG_PASS=%%b"
    )
)
call :log_info "  DB 参数: user=!PG_USER! port=!PG_PORT!"
set "PGPASSWORD=!PG_PASS!"

call :log_info "删除数据库 fertutor..."
"!PSQL_PATH!" -U !PG_USER! -p !PG_PORT! -c "DROP DATABASE IF EXISTS fertutor;" >> "%LOG_FILE%" 2>&1
call :log_info "  DROP DATABASE 退出码: !errorlevel!"

:skip_db

call :log_info "========================================================"
call :log_info "  卸载完成  %date% %time%"
call :log_info "========================================================"

if "!SILENT!"=="0" (
    echo.
    echo 卸载完成！
    pause
)
exit /b 0

:log_info
echo [%time%] %~1
echo [%date% %time%] [INFO] %~1 >> "%LOG_FILE%"
goto :eof

:log_skip
echo [%time%] [跳过] %~1
echo [%date% %time%] [SKIP] %~1 >> "%LOG_FILE%"
goto :eof

:log_cmd
echo [%time%] [CMD] %~1
echo [%date% %time%] [CMD] %~1 >> "%LOG_FILE%"
goto :eof
