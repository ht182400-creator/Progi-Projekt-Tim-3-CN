@echo off
cd /d "d:\Work_Area\AI\Progi-Projekt-Tim-3-CN\Autoinstall_1_3\output"

:: 删除旧的
del /f Fertutor-Setup.exe 2>nul

:: 复制SFX模块
copy /b "D:\Program Files\7-Zip\7z.sfx" + "Fertutor\config.txt" + "Fertutor.zip" "Fertutor-Setup.exe"

echo 完成!
pause