@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========== 彩色输出函数 ==========
:print
echo %~1
goto :eof

:printGreen
echo [绿] %~1
goto :eof

:printYellow
echo [黄] %~1
goto :eof

:printRed
echo [红] %~1
goto :eof

:: ========== 主菜单 ==========
:menu
cls
echo ╔═══════════════════════════════════════════════════════════╗
echo ║           Fertutor 安装程序 - 选择安装方式                 ║
echo ╠═══════════════════════════════════════════════════════════╣
echo ║                                                           ║
echo ║   [1] 虚拟机镜像方案                                       ║
echo ║       💻 完整的 Windows 11 系统 + Docker + 项目           ║
echo ║       预装 Windows 11 Pro，已配置 Docker Desktop          ║
echo ║       开机自动启动服务，适合 VMware/VirtualBox             ║
echo ║                                                           ║
echo ║   [2] Docker 容器方案                                      ║
echo ║       🐳 项目 + Docker 容器（基于您已有的 Windows）        ║
echo ║       需要 Windows 11 + 已安装 Docker Desktop             ║
echo ║       双击 start.bat快速启动                              ║
echo ║                                                           ║
echo ║   [3] 退出                                                 ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

set /p choice=请输入选项 (1/2/3):

if "%choice%"=="1" goto option1
if "%choice%"=="2" goto option2
if "%choice%"=="3" goto exit

echo 无效选项，请重新选择
timeout /t 2 >nul
goto menu

:: ========== 选项1: 虚拟机方案 ==========
:option1
cls
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                    虚拟机镜像方案                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 需要以下文件:
echo   1. packer/windows.iso          - Windows 11 安装镜像
echo   2. packer/docker/Docker*.exe  - Docker Desktop 安装包
echo.
echo 此方案会使用 Packer 自动构建虚拟机镜像
echo.

:: 检查 Packer
where packer >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [提示] 未检测到 Packer，正在尝试安装...
    winget install hashicorp.packer -s winget --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% neq 0 (
        echo [错误] Packer 安装失败
        echo 请手动安装: https://www.packer.io/downloads
        pause
        goto menu
    )
)

:: 检查必要文件
if not exist "packer\windows.iso" (
    echo [错误] 缺少 Windows 11 ISO
    echo 请将 ISO 文件放入: %~dp0packer\windows.iso
    pause
    goto menu
)

if not exist "packer\docker\Docker*.exe" (
    echo [错误] 缺少 Docker Desktop 安装包
    echo 请将安装包放入: %~dp0packer\docker\
    echo 下载地址: https://www.docker.com/products/docker-desktop/
    pause
    goto menu
)

echo [准备] 开始构建虚拟机镜像...
echo [警告] 此过程可能需要 30-60 分钟，请耐心等待
echo.

cd packer
call packer build windows.packer.json

if %ERRORLEVEL% neq 0 (
    echo.
    echo [错误] 构建失败，请检查错误信息
    pause
    goto menu
)

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                     构建完成！                               ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 镜像已生成在: packer\output\
echo.
echo 可导入以下虚拟机软件:
echo   - VMware Workstation / Player
echo   - VirtualBox
echo.
echo 导入后启动即可自动运行 Fertutor 服务
echo   前端: http://localhost:5173
echo   后端: http://localhost:8080
echo.

pause
goto menu

:: ========== 选项2: Docker 方案 ==========
:option2
cls
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                    Docker 容器方案                          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

:: 检查 Docker
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Docker Desktop
    echo.
    echo 请先安装 Docker Desktop:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    pause
    goto menu
)

:: 检查并创建配置文件
if not exist "deploy\docker.env" (
    echo [1/3] 创建配置文件...
    copy deploy\docker.env.example deploy\docker.env
    echo [提示] 已创建配置文件，可根据需要修改密码
    echo.
)

:: 启动服务
echo [2/3] 构建并启动服务...
docker compose --env-file deploy\docker.env up --build -d

if %ERRORLEVEL% neq 0 (
    echo [错误] 启动失败
    docker compose --env-file deploy\docker.env logs
    pause
    goto menu
)

echo.
echo [3/3] 启动完成！
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                     服务已启动！                            ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo   前端开发服务器: http://localhost:5173
echo   后端 API 服务:   http://localhost:8080
echo.
echo 常用命令:
echo   停止服务: docker compose --env-file deploy\docker.env down
echo   查看日志: docker compose --env-file deploy\docker.env logs -f
echo.

:: 打开浏览器
start http://localhost:5173

pause
goto menu

:: ========== 退出 ==========
:exit
echo 再见！
timeout /t 1 >nul
exit /b 0