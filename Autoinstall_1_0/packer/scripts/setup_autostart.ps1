# 自动启动Fertutor服务
$fertutorPath = "C:\Users\Admin\Fertutor"

if (Test-Path $fertutorPath) {
    Write-Host "Setting up Fertutor auto-start..."
    
    # 创建启动任务
    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d $fertutorPath && docker compose --env-file deploy\docker.env up -d"
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User "Admin"
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    
    # 注册任务
    Register-ScheduledTask -TaskName "Fertutor-Start" -Action $action -Trigger $trigger -Settings $settings -Description "Auto-start Fertutor services" -Force
    
    Write-Host "Auto-start task created!"
    
    # 立即启动服务
    cd $fertutorPath
    docker compose --env-file deploy\docker.env up -d
    
    Write-Host "Fertutor services started!"
} else {
    Write-Host "Fertutor folder not found at: $fertutorPath"
}

Write-Host "Setup complete!"