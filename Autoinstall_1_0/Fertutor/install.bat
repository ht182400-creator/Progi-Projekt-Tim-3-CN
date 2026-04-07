@echo off
chcp 65001 >nul
title Fertutor 安装程序

:: ========== 配置 ==========
set "INSTALL_DIR=%USERPROFILE%\Fertutor"
set "SCRIPT_DIR=%~dp0"
set "DOCKER_INSTALLER=docker-desktop.exe"

echo ========================================
echo   Fertutor 全自动安装程序
echo ========================================
echo.

:: ========== 安装 Docker Desktop ==========
echo [1/4] 检查 Docker Desktop...
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 未检测到 Docker，正在安装...
    
    :: 查找安装包
    if exist "%SCRIPT_DIR%%DOCKER_INSTALLER%" (
        echo 使用内置安装包...
        "%SCRIPT_DIR%%DOCKER_INSTALLER%" install --quiet
    ) else (
        echo [错误] 未找到 Docker 安装包: %DOCKER_INSTALLER%
        echo 请下载 Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo 或将安装包重命名为: %DOCKER_INSTALLER%
        pause
        exit /b 1
    )
    
    :: 等待 Docker 启动
    echo 等待 Docker 启动...
    :wait_docker
    docker --version >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        timeout /t 5 >nul
        goto wait_docker
    )
    echo Docker 安装完成
)

:: ========== 复制项目文件 ==========
echo [2/4] 正在复制项目文件...
if not "%SCRIPT_DIR%"=="%INSTALL_DIR%" (
    if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
    xcopy /E /Y "%SCRIPT_DIR%install.bat" "%INSTALL_DIR%\" >nul
    xcopy /E /Y "%SCRIPT_DIR%docker-compose.yml" "%INSTALL_DIR%\" >nul
    xcopy /E /Y "%SCRIPT_DIR%Dockerfile*" "%INSTALL_DIR%\" >nul
    xcopy /E /Y "%SCRIPT_DIR%app" "%INSTALL_DIR%\" >nul
    xcopy /E /Y "%SCRIPT_DIR%deploy" "%INSTALL_DIR%\" >nul
    cd /d "%INSTALL_DIR%"
)

:: ========== 配置环境 ==========
echo [3/4] 正在配置环境...
if not exist "deploy\docker.env" (
    copy deploy\docker.env.example deploy\docker.env
)

:: ========== 启动服务 ==========
echo [4/4] 正在启动服务...
docker compose --env-file deploy\docker.env up --build -d

if %ERRORLEVEL% neq 0 (
    echo [错误] 服务启动失败
    docker compose --env-file deploy\docker.env logs
    pause
    exit /b 1
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo   前端开发服务器: http://localhost:5173
echo   后端 API 服务:   http://localhost:8080
echo.

:: 打开浏览器
start http://localhost:5173

pause