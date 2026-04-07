# Windows 11 无人值守安装指南

## 概述

本项目（Fertutor）是一个基于 Node.js、React 和 PostgreSQL 的全栈应用。由于全新 Windows 11 设备无法直接运行 Node.js 和 PostgreSQL，最优方案是使用 **Docker Desktop**。Docker 包含项目运行所需的所有依赖（Node.js 运行时、PostgreSQL 数据库等），只需安装这一个软件即可。

## 环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 11 专业版/家庭版 |
| 内存 | 至少 4GB（建议 8GB） |
| 磁盘空间 | 至少 20GB |
| 虚拟化 | 需要在 BIOS 中启用 |

## 一、安装 Docker Desktop

### 步骤 1：下载 Docker Desktop

访问 Docker 官方网站下载安装包：
```
https://www.docker.com/products/docker-desktop/
```

点击 "Download for Windows" 下载安装程序。

### 步骤 2：安装 Docker Desktop

1. 双击 `Docker Desktop Installer.exe` 运行安装程序
2. 在安装向导中：
   - 取消勾选 "Use WSL 2 instead of Hyper-V"（如果需要）
   - 勾选 "Add shortcut to desktop"（创建桌面快捷方式）
3. 点击 "Install" 开始安装
4. 安装完成后，点击 "Close" 关闭安装程序
5. **重启计算机**

### 步骤 3：验证 Docker 安装

1. 在开始菜单中搜索并打开 "Docker Desktop"
2. 等待 Docker 启动（显示绿色状态）
3. 打开 PowerShell 或命令提示符，输入以下命令验证：

```powershell
docker --version
docker-compose --version
```

如果显示版本号，则表示安装成功。

## 二、打包分发

将以下文件/文件夹打包为 ZIP 文件即可分发：

```
Fertutor/
├── install.bat          # 安装脚本
├── docker-compose.yml   # 服务配置
├── Dockerfile           # 后端镜像
├── Dockerfile.client    # 前端镜像
├── app/                 # 项目源码
├── deploy/              # 部署配置
└── docker-desktop.exe   # Docker Desktop 安装包（可选）
```

**注意**：Docker 安装包 `docker-desktop.exe` 约 500MB，可从以下地址下载：
```
https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
```
重命名为 `docker-desktop.exe` 后放入项目根目录。

## 三、安装部署

### 方式一：双击运行安装包（推荐）

1. 解压 ZIP 到任意目录
2. 双击运行 `install.bat`
3. 首次安装需等待 Docker Desktop 安装完成（约 5 分钟）

脚本自动完成：
- 检查/安装 Docker Desktop
- 复制项目文件
- 创建配置文件
- 启动所有服务

### 端口说明

| 服务 | 地址 |
|------|------|
| 前端开发服务器 | http://localhost:5173 |
| 后端 API 服务 | http://localhost:8080 |

## 三、常用操作命令

| 操作 | 命令 |
|------|------|
| 启动应用 | `docker compose --env-file deploy\docker.env up -d` |
| 停止应用 | `docker compose --env-file deploy\docker.env down` |
| 查看日志 | `docker compose --env-file deploy\docker.env logs -f` |
| 重启应用 | `docker compose --env-file deploy\docker.env restart` |

## 四、故障排查

### 问题 1：Docker 启动失败

**症状**：Docker Desktop 无法启动或卡在 "Starting..."

**解决方法**：
1. 打开 Windows 功能，启用以下选项：
   - Hyper-V
   - Windows Subsystem for Linux (WSL)
2. 以管理员身份运行 PowerShell，执行：
   ```powershell
   wsl --install
   ```
3. 重启计算机

### 问题 2：端口冲突

**症状**：提示 "Port 5173/8080 is already in use"

**解决方法**：
1. 打开 PowerShell，查找占用端口的进程：
   ```powershell
   netstat -ano | findstr :5173
   ```
2. 结束相关进程或修改 `docker-compose.yml` 中的端口映射

### 问题 3：数据库连接失败

**症状**：应用日志显示数据库连接错误

**解决方法**：
1. 检查 `deploy/docker.env` 中数据库配置是否正确
2. 查看日志排查：
   ```powershell
   docker compose --env-file deploy\docker.env logs db
   ```

## 五、卸载

如需卸载项目和数据：

```powershell
# 停止并删除容器
docker compose --env-file deploy\docker.env down -v

# 删除 Docker 镜像（可选）
docker rmi fertutor-app
```

如需完全卸载 Docker Desktop：
1. 打开 "设置" → "应用"
2. 找到 "Docker Desktop" 并点击 "卸载"

---

**技术支持**：如有问题，请查看项目 README.md 或提交 Issue。