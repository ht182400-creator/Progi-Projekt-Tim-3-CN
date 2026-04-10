@echo off
chcp 65001 >nul 2>&1
title Fertutor 安装程序
setlocal enabledelayedexpansion

cd /d "%~dp0"
set "LOG_FILE=%~dp0install.log"

echo. >> "%LOG_FILE%"
echo [%date% %time%] [INFO] ======================================== >> "%LOG_FILE%"
echo [%date% %time%] [INFO] Fertutor.bat 启动 >> "%LOG_FILE%"
echo [%date% %time%] [INFO] 安装目录: %~dp0 >> "%LOG_FILE%"
echo [%date% %time%] [INFO] 操作系统: %OS% >> "%LOG_FILE%"
echo [%date% %time%] [INFO] ======================================== >> "%LOG_FILE%"

:menu
cls
echo.
echo  ================================================
echo        Fertutor 安装程序 v2.0
echo  ================================================
echo.
echo   [1] Windows 本地模式  (Node.js + PostgreSQL)
echo       不需要 Docker，直接在系统上运行
echo.
echo   [2] Windows Docker 模式
echo       需要 Docker Desktop，一键启动所有服务
echo.
echo   [3] 卸载服务
echo.
echo   [0] 退出
echo.
echo  ================================================
echo.

set /p choice=请选择 [0-3]: 

echo [%date% %time%] [INFO] 用户选择: !choice! >> "%LOG_FILE%"
if "!choice!"=="1" goto option_local
if "!choice!"=="2" goto option_docker
if "!choice!"=="3" goto option_uninstall
if "!choice!"=="0" (
    echo [%date% %time%] [INFO] 用户退出程序 >> "%LOG_FILE%"
    exit /b 0
)

echo 无效选择
timeout /t 2 >nul
goto menu

:option_local
cls
echo.
echo  ================================================
echo    Windows 本地模式
echo  ------------------------------------------------
echo    将安装以下软件（已安装的会自动跳过）:
echo      - Node.js 20 LTS
echo      - PostgreSQL 16
echo      - Fertutor Windows 服务 (NSSM)
echo  ================================================
echo.
set /p confirm=确认安装? [Y/n]: 
if /i "!confirm!"=="n" (
    echo [%date% %time%] [INFO] 用户取消本地安装 >> "%LOG_FILE%"
    goto menu
)
echo [%date% %time%] [INFO] 进入本地安装模式 >> "%LOG_FILE%"
call "%~dp0scripts\install-local.bat"
goto menu

:option_docker
cls
echo.
echo  ================================================
echo    Windows Docker 模式
echo  ------------------------------------------------
echo    将安装以下软件（已安装的会自动跳过）:
echo      - Docker Desktop
echo    并通过 Docker 运行:
echo      - PostgreSQL 16 容器
echo      - Node.js 后端容器
echo      - 前端容器
echo  ================================================
echo.
set /p confirm=确认安装? [Y/n]: 
if /i "!confirm!"=="n" (
    echo [%date% %time%] [INFO] 用户取消 Docker 安装 >> "%LOG_FILE%"
    goto menu
)
echo [%date% %time%] [INFO] 进入 Docker 安装模式 >> "%LOG_FILE%"
call "%~dp0scripts\install-docker.bat"
goto menu

:option_uninstall
cls
echo [%date% %time%] [INFO] 进入卸载模式 >> "%LOG_FILE%"
call "%~dp0scripts\uninstall.bat"
goto menu
