@echo off
setlocal ENABLEDELAYEDEXPANSION

:: ==========================================================
:: Portable Node.js + Yarn Environment Bootstrap
:: ==========================================================

set "ROOT=%~dp0"
set "NODEJS_PORTABLE=%ROOT%bin\nodejs"
set "NODE_GLOBALS=%NODEJS_PORTABLE%\node_modules\npm\bin"
set "COREPACK_BIN=%NODEJS_PORTABLE%\node_modules\corepack\dist"
set "YARN_BIN=%NODEJS_PORTABLE%\node_modules\yarn\bin"

set "PATH=%NODEJS_PORTABLE%;%NODE_GLOBALS%;%COREPACK_BIN%;%YARN_BIN%;%PATH%"

echo ===============================================
echo   Portable Node.js + Yarn Environment
echo -----------------------------------------------
echo   Node exe path: "%NODEJS_PORTABLE%\node.exe"
echo -----------------------------------------------

"%NODEJS_PORTABLE%\node.exe" -v >nul 2>&1
if errorlevel 1 (
  echo [ERROR] node.exe tidak bisa dijalankan.
  exit /b 1
)

for /f "delims=" %%v in ('"%NODEJS_PORTABLE%\node.exe" -v') do set "NODE_VERSION=%%v"
echo   Node Version : %NODE_VERSION%
for /f "delims=" %%v in ('npm -v') do set "NPM_VERSION=%%v"
echo   NPM  Version : %NPM_VERSION%
for /f "delims=" %%v in ('yarn -v') do set "YARN_VERSION=%%v"
echo   Yarn Version : %YARN_VERSION%
echo ===============================================

:: ==========================================================
:: Jika ada argumen → jalankan langsung (service mode)
:: ==========================================================
if not "%~1"=="" (
    echo [INFO] Menjalankan perintah langsung: %*
    cd /d "%ROOT%"
    %*
    exit /b %ERRORLEVEL%
)

:: ==========================================================
:: Jika TIDAK ada argumen → buka interactive shell
:: ==========================================================
echo [INFO] Membuka interactive shell...
cd /d "%ROOT%"
cmd /k "title Portable Node.js Shell & echo [Node Portable] Environment aktif."
exit /b 0