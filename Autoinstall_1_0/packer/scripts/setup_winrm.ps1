# WinRM配置 - 允许Packer远程连接
$password = ConvertTo-SecureString "Fertutor123" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential("Admin", $password)

# 启用WinRM
Enable-PSRemoting -Force -SkipNetworkProfileCheck

# 设置WinRM服务为自动启动
Set-Service WinRM -StartupType Automatic

# 配置WinRM
winrm set winrm/config/service '@{AllowUnencrypted="true"}'
winrm set winrm/config/service/auth '@{Basic="true"}'
winrm set winrm/config/winrs '@{MaxMemoryPerShellMB="1024"}'

# 添加受信任主机
Set-Item WSML:\WSMan\localhost\Client\TrustedHosts -Value "*" -Force

# 防火墙规则
New-NetFirewallRule -DisplayName "WinRM" -Direction Inbound -Protocol TCP -LocalPort 5985,5986 -Action Allow

# 创建管理员用户（如果不存在）
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
Write-Host "Current user: $user"

Write-Host "WinRM configured successfully"