@echo off
setlocal EnableDelayedExpansion
title Toolmap Registry Server
cls

REM ============================================
REM PALETTE COLORI (ANSI - Windows 10+)
REM ============================================
REM Genera carattere ESC tramite PowerShell
for /f %%a in ('powershell -command "[char]27"') do set "ESC=%%a"

set "CYAN=%ESC%[96m"
set "BLUE=%ESC%[94m"
set "GREEN=%ESC%[92m"
set "YELLOW=%ESC%[93m"
set "RED=%ESC%[91m"
set "MAGENTA=%ESC%[95m"
set "WHITE=%ESC%[97m"
set "GRAY=%ESC%[90m"
set "RESET=%ESC%[0m"
set "BOLD=%ESC%[1m"

REM Ottieni il percorso assoluto della directory del progetto
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%..\.."
cd /d "%PROJECT_DIR%"

echo.
echo %CYAN%=========================================%RESET%
echo %CYAN%%BOLD%      TOOLMAP REGISTRY SERVER%RESET%
echo %CYAN%=========================================%RESET%
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

echo   %BLUE%[LOCALE]%RESET%     %MAGENTA%http://localhost:8000/app/%RESET%
echo   %BLUE%[RETE]%RESET%       %MAGENTA%http://%IP%:8000/app/%RESET%
echo.
echo   %GRAY%Accessibile da qualsiasi dispositivo sulla stessa rete%RESET%
echo   %YELLOW%Chiudi questa finestra per fermare il server%RESET%
echo.
echo %CYAN%=========================================%RESET%
echo.
echo   %GREEN%[OK]%RESET% %WHITE%Server in avvio...%RESET%
echo.

REM Apri browser automaticamente
start "" http://localhost:8000/app/

REM Avvia server Python dalla root del progetto
python -m http.server 8000 2>nul
if errorlevel 1 (
    python3 -m http.server 8000 2>nul
)

REM Se Python non trovato
if errorlevel 1 (
    echo.
    echo   %RED%[ERRORE]%RESET% %WHITE%Python non trovato!%RESET%
    echo   %GRAY%Installa Python 3 per utilizzare questo server.%RESET%
    echo.
    pause
)

endlocal
