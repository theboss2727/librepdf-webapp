@echo off
title LibrePDF Studio - Avvio Locale
chcp 65001 >nul
cls

echo ========================================================
echo         LibrePDF Studio - Avvio Locale (Windows)
echo ========================================================
echo.
echo [1/3] Verifica ambiente di sistema...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRORE] Node.js non trovato! Installa Node.js da https://nodejs.org/
    pause
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo [OK] Rilevato %%v
) else (
    echo [INFO] Python non trovato in PATH. Le conversioni Office useranno FreeConvert se non installato.
)

if not exist node_modules (
    echo.
    echo [INFO] Cartella node_modules non trovata. Installazione dipendenze in corso...
    call npm install
)

echo.
echo [2/3] Avvio server locale con motore di conversione...
start /b "" npx tsx server.ts

echo.
echo [3/3] Apertura di LibrePDF nel browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================================
echo  LibrePDF e' attivo all'indirizzo: http://localhost:3000
echo  - Motore locale 1:1: ATTIVO
echo  - Elaborazione file: 100%% OFFLINE E PRIVATA SUL TUO PC
echo.
echo  Premi CTRL+C in questa finestra per arrestare il server.
echo ========================================================
echo.

pause >nul
