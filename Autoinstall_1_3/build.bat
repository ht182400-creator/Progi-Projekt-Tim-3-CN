@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Fertutor 打包工具

echo ========================================
echo   Fertutor 打包工具
echo ========================================
echo.

set "SCRIPT_DIR=%~dp0"
set "FERTUTOR_DIR=%SCRIPT_DIR%Fertutor"
set "OUTPUT_DIR=%SCRIPT_DIR%output"

:: ============================================================
:: 检查 NSSM 是否存在（需要手动下载放入 tools\）
:: ============================================================
if not exist "%FERTUTOR_DIR%\tools\nssm.exe" (
    echo [警告] 未找到 tools\nssm.exe
    echo 请从 https://nssm.cc/download 下载 nssm.exe
    echo 放入: %FERTUTOR_DIR%\tools\nssm.exe
    echo.
    set /p SKIP=跳过并继续? [y/N]: 
    if /i not "!SKIP!"=="y" exit /b 1
)

:: ============================================================
:: 方式1: Inno Setup 打包（推荐，带 UI 向导）
:: ============================================================
echo [1/2] 尝试 Inno Setup 打包...
set "ISCC="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "C:\Program Files\Inno Setup 6\ISCC.exe"       set "ISCC=C:\Program Files\Inno Setup 6\ISCC.exe"
if exist "D:\Program Files (x86)\Inno Setup 6\ISCC.exe" set "ISCC=D:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist "D:\Program Files\Inno Setup 6\ISCC.exe"       set "ISCC=D:\Program Files\Inno Setup 6\ISCC.exe"
:: 搜索 D 盘其他可能路径
for /r "D:\" %%f in (ISCC.exe) do if not defined ISCC set "ISCC=%%f"

if defined ISCC (
    echo 使用 Inno Setup: !ISCC!
    "!ISCC!" "%FERTUTOR_DIR%\Fertutor.iss"
    if !errorlevel! equ 0 (
        echo.
        echo ========================================
        echo   打包完成！
        echo   输出: %OUTPUT_DIR%\
        echo ========================================
        explorer "%OUTPUT_DIR%"
        pause
        exit /b 0
    ) else (
        echo [错误] Inno Setup 打包失败
    )
) else (
    echo [跳过] 未安装 Inno Setup
    echo 下载地址: https://jrsoftware.org/isdl.php
)

:: ============================================================
:: 方式2: 7-Zip SFX 打包（备用）
:: ============================================================
echo.
echo [2/2] 尝试 7-Zip SFX 打包...
set "7Z="
if exist "C:\Program Files\7-Zip\7z.exe"       set "7Z=C:\Program Files\7-Zip\7z.exe"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set "7Z=C:\Program Files (x86)\7-Zip\7z.exe"
if exist "D:\Program Files\7-Zip\7z.exe"       set "7Z=D:\Program Files\7-Zip\7z.exe"
if exist "D:\Program Files (x86)\7-Zip\7z.exe" set "7Z=D:\Program Files (x86)\7-Zip\7z.exe"
:: 搜索 D 盘其他可能路径
for /r "D:\" %%f in (7z.exe) do if not defined 7Z set "7Z=%%f"
if exist "C:\7-Zip\7z.exe"                      set "7Z=C:\7-Zip\7z.exe"

if not defined 7Z (
    echo [错误] 未找到 7-Zip
    echo 请安装 Inno Setup 或 7-Zip 后重试
    pause
    exit /b 1
)

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: 打包
set "ZIP_FILE=%OUTPUT_DIR%\Fertutor.zip"
set "SFX_FILE=%OUTPUT_DIR%\Fertutor-Setup-2.0.0.exe"

echo 压缩文件...
"!7Z!" a -tzip -mx9 "!ZIP_FILE!" "%FERTUTOR_DIR%\*" -xr!install.log
if !errorlevel! neq 0 (
    echo [错误] 压缩失败
    pause
    exit /b 1
)

:: 找 7z SFX 模块
set "SFX_MODULE="
if exist "C:\Program Files\7-Zip\7z.sfx"       set "SFX_MODULE=C:\Program Files\7-Zip\7z.sfx"
if exist "C:\Program Files (x86)\7-Zip\7z.sfx" set "SFX_MODULE=C:\Program Files (x86)\7-Zip\7z.sfx"

if not defined SFX_MODULE (
    echo [警告] 未找到 7z.sfx，输出普通 zip 包
    echo 输出: !ZIP_FILE!
    pause
    exit /b 0
)

copy /b "!SFX_MODULE!" + "%FERTUTOR_DIR%\config.txt" + "!ZIP_FILE!" "!SFX_FILE!" >nul
del "!ZIP_FILE!" >nul

echo.
echo ========================================
echo   打包完成！
echo   输出: !SFX_FILE!
echo ========================================
explorer "%OUTPUT_DIR%"
pause
