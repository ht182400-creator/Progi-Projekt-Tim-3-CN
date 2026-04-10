@echo off
cd /d "d:\Work_Area\AI\Progi-Projekt-Tim-3-CN\Autoinstall_1_3"

echo 正在创建压缩包...
"D:\Program Files\7-Zip\7z.exe" a -r -mx9 "output\Fertutor.zip" "Fertutor\*"

echo 正在创建自解压 EXE...
"D:\Program Files\7-Zip\7z.exe" a -sfx7z.sfx -mx9 "output\Fertutor-Setup.exe" "output\Fertutor.zip" "Fertutor\config.txt"

echo 完成!
pause