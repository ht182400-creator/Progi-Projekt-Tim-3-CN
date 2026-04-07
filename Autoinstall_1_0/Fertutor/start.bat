@echo off
chcp 65001 >nul
echo ========================================
echo   Fertutor 一键启动脚本
echo ========================================
echo.

:: 检查 Docker 是否安装
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未检测到 Docker Desktop
    echo 请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

:: 检查并创建配置文件
if not exist "deploy\docker.env" (
    echo [1/3] 正在创建配置文件...
    copy deploy\docker.env.example deploy\docker.env
    echo [提示] 请编辑 deploy\docker.env 修改数据库密码和安全密钥
    echo.
)

:: 启动所有服务
echo [2/3] 正在构建并启动所有服务...
docker compose --env-file deploy\docker.env up --build -d

if %ERRORLEVEL% neq 0 (
    echo [错误] 启动失败，请检查 Docker 是否正常运行
    pause
    exit /b 1
)

echo.
echo [3/3] 服务启动完成！
echo.
echo ========================================
echo   前端开发服务器: http://localhost:5173
echo   后端 API 服务:   http://localhost:8080
echo ========================================
echo.
echo 常用命令:
echo   停止: docker compose --env-file deploy\docker.env down
echo   日志: docker compose --env-file deploy\docker.env logs -f
echo.

pause