# Windows安装应答文件
$setup = @{
    "ImagePath" = "Windows 11 Pro"
    "FullName" = "Admin"
    "OrganizationName" = "Fertutor"
    "ComputerName" = "FERTUTOR-PC"
    "Password" = "Fertutor123"
}

# 启用远程桌面
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -Name "fDenyTSConnections" -Value 0

# 启用Ping
New-NetFirewallRule -DisplayName "Allow ICMPv4" -Direction Inbound -Protocol ICMPv4 -Action Allow

# 禁用防火墙提示
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'DisableFirewallWarning' -Value 'netsh advfirewall set allprofiles state off'