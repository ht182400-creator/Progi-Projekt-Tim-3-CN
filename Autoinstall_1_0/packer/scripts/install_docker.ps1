# Docker Desktop 安装脚本
# 注意: 需要提前下载 Docker Desktop 安装包并放在 C:\Docker\

Write-Host "Installing Docker Desktop..."

$installer = "C:\Docker\Docker Desktop Installer.exe"

if (!(Test-Path $installer)) {
    Write-Host "Docker installer not found. Please place it at: $installer"
    Write-Host "Download from: https://www.docker.com/products/docker-desktop/"
    exit 1
}

# 安装Docker Desktop (静默安装)
Start-Process -FilePath $installer -ArgumentList "install --quiet" -Wait

# 等待Docker启动
Write-Host "Waiting for Docker to start..."
$dockerStarted = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        docker version | Out-Null
        $dockerStarted = $true
        break
    } catch {
        Start-Sleep -Seconds 5
    }
}

if ($dockerStarted) {
    Write-Host "Docker installed successfully!"
    # 启用Docker服务
    Set-Service -Name com.docker.service -StartupType Automatic
    Start-Service com.docker.service
} else {
    Write-Host "Docker installation may have issues. Please check manually."
}

Write-Host "Done."