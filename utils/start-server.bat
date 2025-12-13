@echo off
title Toolmap Registry Server
color 0A
cls

echo =========================================
echo    TOOLMAP REGISTRY SERVER
echo =========================================
echo.

REM Attiva conda base se disponibile (safe anche se già attivo)
if exist "C:\ProgramData\miniconda3\condabin\conda.bat" (
    call C:\ProgramData\miniconda3\condabin\conda.bat activate base 2>nul
)

REM Trova IP locale
set "IP=Non disponibile"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set "IP=%%a"
    set "IP=!IP:~1!"
    goto :ip_found
)
:ip_found

echo [LOCALE]     http://localhost:8000/app/
echo [RETE]       http://%IP%:8000/app/
echo.
echo Accessibile da qualsiasi dispositivo sulla stessa rete
echo Premi CTRL+C per fermare il server
echo =========================================
echo.

REM Apri browser automaticamente dopo 2 secondi
start "" http://localhost:8000/

REM Avvia server Python dalla root del progetto (parent di utils/)
cd ..
python -m http.server 8000

REM Se Python fallisce, prova con python3
if errorlevel 1 (
    python3 -m http.server 8000
)

pause