@echo off
setlocal enabledelayedexpansion

:: -------------------------
:: Config
:: -------------------------
set "ROOT=%~dp0"
set "NODEJS_PORTABLE=%ROOT%bin\nodejs"

:: Tambahkan portable node ke PATH
set "PATH=%NODEJS_PORTABLE%;%NODEJS_PORTABLE%\node_modules\.bin;%PATH%"

echo =================================================
echo  Portable Node.js - Install Node Modules
echo -------------------------------------------------
echo  Node executable: "%NODEJS_PORTABLE%\node.exe"
echo -------------------------------------------------

:: Cek Node
"%NODEJS_PORTABLE%\node.exe" -v 2>nul
if errorlevel 1 (
    echo [ERROR] node.exe tidak dapat dijalankan dari: "%NODEJS_PORTABLE%\node.exe"
    echo Pastikan folder "%NODEJS_PORTABLE%" berisi node.exe
) else (
    for /f "delims=" %%v in ('"%NODEJS_PORTABLE%\node.exe" -v') do set "NODE_VERSION=%%v"
    echo  Node Version: %NODE_VERSION%
)
echo.

:: -------------------------
:: Hapus node_modules lama (opsional)
:: -------------------------
set "ANS="
set /P ANS=Hapus folder node_modules sebelum install? (Y/N) :

if /I "%ANS%"=="Y" (
    if exist "%ROOT%node_modules" (
        echo Menghapus "%ROOT%node_modules" ...
        rd /s /q "%ROOT%node_modules" 2>nul
        if errorlevel 1 (
            echo [WARNING] Gagal menghapus node_modules
        ) else (
            echo Berhasil menghapus node_modules
        )
    ) else (
        echo Folder node_modules tidak ditemukan, lanjut...
    )
) else (
    echo Melewati penghapusan node_modules.
)
echo.

:: -------------------------
:: Install dependencies
:: -------------------------
echo Memulai proses install node_modules...
echo -------------------------------------------------
call "%NODEJS_PORTABLE%\npm.cmd" install
if errorlevel 1 (
    echo [ERROR] npm install gagal. Silakan cek log di atas.
) else (
    echo npm install selesai dengan sukses.
)

:: -------------------------
:: Akhir
:: -------------------------
echo.
echo =================================================
echo Proses selesai. Tekan sembarang tombol untuk keluar...
pause
:: Jangan exit /b, biar jendela tetap terbuka
