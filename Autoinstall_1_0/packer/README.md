# 使用 Packer 构建 Windows 11 + Fertutor 虚拟机镜像

## 概述

本方案使用 HashiCorp Packer 自动构建包含以下内容的 Windows 11 虚拟机镜像：
- Windows 11 Pro
- Docker Desktop
- Fertutor 项目（自动启动）

## 前置要求

1. **安装 Packer**：
   ```powershell
   winget install hashicorp.packer
   ```

2. **下载 Windows 11 ISO**：
   - 访问 https://www.microsoft.com/software-download/windows11
   - 创建 Windows 11 安装介质
   - 或使用官方 ISO 下载工具

3. **下载 Docker Desktop 安装包**：
   ```
   https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe
   ```
   放置到：`Autoinstall_1_0/packer/docker/`

## 目录结构

```
packer/
├── windows.packer.json     # Packer 配置文件
├── docker/                 # Docker 安装包目录
│   └── Docker Desktop Installer.exe
└── scripts/                # 自动应答脚本
    ├── answer.ps1          # Windows 安装应答
    ├── setup_winrm.ps1     # WinRM 配置
    ├── install_docker.ps1  # Docker 安装
    └── setup_autostart.ps1 # 自动启动配置
```

## 构建步骤

### 1. 准备文件

```powershell
cd Autoinstall_1_0/packer

# 放入 Docker 安装包
# 放入 Windows 11 ISO
```

### 2. 编辑配置

编辑 `windows.packer.json`，修改以下变量：

```json
{
  "variables": {
    "iso_path": "D:/ISOs/Win11_23H2_Chinese_Simplified_x64.iso",
    "iso_checksum": "sha256:xxxxxxxxxxxxxxxx",
    "vm_name": "Fertutor-Win11",
    "username": "Admin",
    "password": "Fertutor123"
  }
}
```

### 3. 验证配置

```powershell
packer validate windows.packer.json
```

### 4. 构建镜像

```powershell
packer build windows.packer.json
```

## 输出

- **VMware**: `output-vmware-iso/Fertutor-Win11.vmx`
- **VirtualBox**: `output-virtualbox-iso/Fertutor-Win11.ovf`

## 注意事项

1. **硬件虚拟化**：确保 BIOS 中已启用 VT-x/AMD-V
2. **内存建议**：至少 6GB RAM 分配给虚拟机
3. **磁盘空间**：建议 80GB 以上
4. **首次启动**：Windows 11 首次启动后需等待 Docker 自动启动服务（约 2-3 分钟）

## 分发

构建完成后，可以：
1. 导出为 OVA/OVF 格式，分发给其他用户
2. 转换为 VHD/VMDK 镜像
3. 直接使用 VMware/VirtualBox 打开

用户只需：
1. 导入虚拟机
2. 启动
3. 等待自动启动（前端 5173 + 后端 8080）