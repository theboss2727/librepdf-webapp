@echo off
title LibrePDF Studio - Arresto Server Locale
chcp 65001 >nul
cls

echo ========================================================
echo         LibrePDF Studio - Arresto Server Locale
echo ========================================================
echo.

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [INFO] Chiusura processo server locale (PID: %%a)...
    taskkill /f /pid %%a >nul 2>&1
    set FOUND=1
)

if "%FOUND%"=="1" (
    echo.
    echo [OK] Server locale arrestato con successo.
) else (
    echo [INFO] Nessun server LibrePDF attivo rilevato sulla porta 3000.
)

echo.
timeout /t 2 >nul
exit /b 0
