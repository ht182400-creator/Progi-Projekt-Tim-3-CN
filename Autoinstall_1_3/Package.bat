@echo off
chcp 65001 >nul
title 打包 Fertutor 安装包

echo ========================================
echo   Fertutor 自解压安装包打包工具
echo ========================================
echo.

set "SEVENZIP=D:\Program Files\7-Zip\7z.exe"

echo [1/3] 清理输出目录...
if exist "output" rmdir /s /q "output" 2>nul
mkdir "output"

echo [2/3] 正在创建压缩包...
cd Fertutor
"%SEVENZIP%" a -r -y -mx..\temp\Fertutor.zip * -x!*.iss -x!config.txt
cd ..

echo [3/3] 正在创建自解压 EXE...
copy /b "D:\Program Files\7-Zip\7z.sfx" + Fertutor\config.txt + temp\Fertutor.zip "output\Fertutor-Setup.exe"

:: 清理
rmdir /s /q temp 2>nul

echo.
echo ========================================
echo   打包完成!
echo ========================================
echo 输出: output\Fertutor-Setup.exe
echo.

explorer output

pause