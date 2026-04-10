# Fertutor 安装包 v1.3.0

## 安装方式

运行 `Fertutor_Setup_1.3.0.exe`，在向导中选择安装模式：

| 模式 | 适用场景 | 依赖 |
|------|----------|------|
| 本地模式（推荐） | 生产部署、长期运行 | 自动安装 Node.js + PostgreSQL |
| Docker 模式 | 开发测试、快速体验 | 需已安装 Docker Desktop |

安装完成后访问：**http://localhost:8080**

---

## 测试方案

### 本地模式测试（推荐）

**环境要求：** Windows 10/11（任意版本），无需额外软件。

**步骤：**

1. 运行安装包，选择"本地模式"
2. 向导完成后自动配置，浏览器会自动打开 http://localhost:8080
3. 查看安装日志确认无错误：
   ```
   C:\Program Files\Fertutor\install.log
   ```
4. 服务管理：`Win + R` → `services.msc` → 找到 `Fertutor`

**重复测试（不重新安装）：**
```bat
:: 以管理员身份运行
"C:\Program Files\Fertutor\scripts\install-local.bat"
```

**卸载：** 控制面板 → 程序 → 卸载 Fertutor，会自动停止服务并删除数据库。

---

### Docker 模式测试

**环境要求：** 已安装并运行 Docker Desktop（WSL2 后端）。

**最佳隔离测试方案 —— 使用 VMware Player（免费）：**

1. 下载 [VMware Workstation Player](https://www.vmware.com/products/workstation-player.html)
2. 创建 Windows 11 虚拟机，分配 4GB 内存、2 核 CPU
3. 在虚拟机的 `.vmx` 文件中加入（开启嵌套虚拟化）：
   ```
   vhv.enable = "TRUE"
   hypervisor.cpuid.v0 = "FALSE"
   ```
4. 虚拟机里安装 Docker Desktop，选择 **WSL2 后端**
5. 在虚拟机里运行安装包，选择"Docker 模式"
6. 测试完毕后删除虚拟机，宿主机零残留

> 不建议在 Docker 容器里测试 Docker 模式，Windows 容器内无法启动 Docker Desktop（缺少 WSL2/Hyper-V 支持）。

---

### 调试技巧

修改脚本后无需重新打包，直接覆盖已安装目录测试：

```bat
:: 修改源码后同步到安装目录
copy /y "Autoinstall_1_3\Fertutor\scripts\install-local.bat" "C:\Program Files\Fertutor\scripts\install-local.bat"

:: 以管理员身份直接运行测试
"C:\Program Files\Fertutor\scripts\install-local.bat"
```

确认无误后再打包：
```bat
"D:\Program Files (x86)\Inno Setup 6\ISCC.exe" Autoinstall_1_3\Fertutor\Fertutor.iss
```

---

## 日志文件

| 文件 | 内容 |
|------|------|
| `C:\Program Files\Fertutor\install.log` | 安装/卸载全过程日志 |
| `C:\Program Files\Fertutor\logs\server.log` | Node.js 服务运行日志 |
| `C:\Program Files\Fertutor\logs\server-error.log` | Node.js 服务错误日志 |

---

## 端口

| 服务 | 地址 |
|------|------|
| 前端 + 后端（本地模式） | http://localhost:8080 |
| 后端 API（Docker 模式） | http://localhost:8080 |
| 前端（Docker 模式） | http://localhost:5173 |
