@echo off
title LibrePDF Studio - Creazione Icona Desktop
chcp 65001 >nul
cls

echo ========================================================
echo   LibrePDF Studio - Creazione Icona su Desktop Windows
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crea-collegamento-desktop.ps1"

echo.
echo ========================================================
echo  Troverai ora l'icona 'LibrePDF' sul tuo Desktop!
echo  
echo  Fai doppio clic sull'icona per avviare LibrePDF:
echo  - Server locale avviato in background (invisibile)
echo  - Finestra nativa elegante senza barre del browser
echo  - Motore Office (Word ed Excel 1:1) ATTIVO al 100%%
echo ========================================================
echo.
pause
