@echo off
title LibrePDF Desktop Studio - Compilazione .EXE
chcp 65001 >nul
cls

echo ========================================================
echo   LibrePDF Desktop Studio - Compilatore Eseguibile Windows
echo ========================================================
echo.
echo [1/3] Verifica ed installazione pacchetti Python...
pip install -r requirements.txt

echo.
echo [2/3] Compilazione con PyInstaller (One-Dir + Windowed)...
pyinstaller --noconfirm --onedir --windowed --collect-data pymupdf --name "LibrePdf" main.py

echo.
echo [3/3] Compilazione completata!
echo.
echo ========================================================
echo  L'eseguibile e' pronto all'uso nella cartella:
echo    dist\LibrePdf\LibrePdf.exe
echo.
echo  Puoi copiare la cartella 'LibrePdf' o creare un
echo  collegamento a 'LibrePdf.exe' sul tuo Desktop!
echo ========================================================
echo.
pause
