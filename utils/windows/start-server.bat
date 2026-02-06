@echo off
setlocal EnableDelayedExpansion
title Toolmap Registry Server
cls

REM ============================================
REM PALETTE COLORI (ANSI - Windows 10+)
REM ============================================
set "ESC="
for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
if "!ESC!"=="" set "ESC=[" 

set "CYAN=!ESC![96m"
set "BLUE=!ESC![94m"
set "GREEN=!ESC![92m"
set "YELLOW=!ESC![93m"
set "RED=!ESC![91m"
set "MAGENTA=!ESC![95m"
set "WHITE=!ESC![97m"
set "GRAY=!ESC![90m"
set "RESET=!ESC![0m"
set "BOLD=!ESC![1m"

REM Ottieni il percorso assoluto della directory del progetto
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%..\.."
cd /d "%PROJECT_DIR%"

echo.
echo !CYAN!==========================================================!RESET!
echo !CYAN!!BOLD!                  TOOLMAP REGISTRY SERVER!RESET!
echo !CYAN!==========================================================!RESET!
echo.

REM ============================================
REM VERIFICA CONDA E ATTIVAZIONE
REM ============================================
set "CONDA_FOUND=0"
set "PYTHON_CMD="

REM Cerca conda in posizioni comuni
if exist "C:\ProgramData\miniconda3\condabin\conda.bat" (
    call C:\ProgramData\miniconda3\condabin\conda.bat activate base 2>nul
    if !errorlevel! equ 0 (
        set "CONDA_FOUND=1"
        set "PYTHON_CMD=python"
        echo   !GREEN![OK]!RESET! !WHITE!Conda attivato ^(miniconda3^)!RESET!
        echo.
    )
)

if "!CONDA_FOUND!"=="0" if exist "C:\ProgramData\anaconda3\condabin\conda.bat" (
    call C:\ProgramData\anaconda3\condabin\conda.bat activate base 2>nul
    if !errorlevel! equ 0 (
        set "CONDA_FOUND=1"
        set "PYTHON_CMD=python"
        echo   !GREEN![OK]!RESET! !WHITE!Conda attivato ^(anaconda3^)!RESET!
        echo.
    )
)

if "!CONDA_FOUND!"=="0" if exist "%USERPROFILE%\miniconda3\condabin\conda.bat" (
    call "%USERPROFILE%\miniconda3\condabin\conda.bat" activate base 2>nul
    if !errorlevel! equ 0 (
        set "CONDA_FOUND=1"
        set "PYTHON_CMD=python"
        echo   !GREEN![OK]!RESET! !WHITE!Conda attivato ^(utente^)!RESET!
        echo.
    )
)

if "!CONDA_FOUND!"=="0" if exist "%USERPROFILE%\anaconda3\condabin\conda.bat" (
    call "%USERPROFILE%\anaconda3\condabin\conda.bat" activate base 2>nul
    if !errorlevel! equ 0 (
        set "CONDA_FOUND=1"
        set "PYTHON_CMD=python"
        echo   !GREEN![OK]!RESET! !WHITE!Conda attivato ^(utente anaconda3^)!RESET!
        echo.
    )
)

if "!CONDA_FOUND!"=="0" (
    where conda >nul 2>&1
    if !errorlevel! equ 0 (
        call conda activate base 2>nul
        if !errorlevel! equ 0 (
            set "CONDA_FOUND=1"
            set "PYTHON_CMD=python"
            echo   !GREEN![OK]!RESET! !WHITE!Conda attivato ^(PATH^)!RESET!
            echo.
        )
    )
)

REM ============================================
REM FALLBACK SU PYTHON STANDARD
REM ============================================
if "!CONDA_FOUND!"=="0" (
    echo   !YELLOW![INFO]!RESET! !WHITE!Conda non trovato, uso Python di sistema!RESET!
    
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_CMD=python"
    ) else (
        where python3 >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_CMD=python3"
        )
    )
)

REM ============================================
REM VERIFICA FINALE PYTHON
REM ============================================
if "!PYTHON_CMD!"=="" (
    echo.
    echo   !RED![ERRORE]!RESET! !WHITE!Python non trovato!!RESET!
    echo   !GRAY!Installa Python 3 o Conda per utilizzare questo server.!RESET!
    echo.
    pause
    exit /b 1
)

REM ============================================
REM TROVA IP LOCALE
REM ============================================
set "IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set "IP=%%a"
    set "IP=!IP:~1!"
    goto :ip_found
)
:ip_found

REM ============================================
REM TROVA PRIMA PORTA LIBERA
REM ============================================
set "PORT=0"

for %%p in (8000 3000 5000 8080 8001 8888 9000 4000) do (
    if !PORT! equ 0 (
        echo   !YELLOW![TEST]!RESET! !WHITE!Verifico porta %%p...!RESET!
        
        REM Testa la porta con timeout di 1 secondo
        start /b cmd /c "!PYTHON_CMD! -m http.server %%p >nul 2>&1"
        timeout /t 1 /nobreak >nul
        
        REM Verifica se il server è partito
        netstat -an | find ":%%p " | find "LISTENING" >nul
        if !errorlevel! equ 0 (
            set "PORT=%%p"
            echo   !GREEN![OK]!RESET! !WHITE!Porta %%p disponibile!!RESET!
            
            REM Ferma il test
            for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%p ^| findstr LISTENING') do (
                taskkill /PID %%a /F >nul 2>&1
            )
        ) else (
            echo   !RED![X]!RESET! !GRAY!Porta %%p non disponibile!RESET!
            echo.
        )
    )
)

if !PORT! equ 0 (
    echo.
    echo   !RED![ERRORE]!RESET! !WHITE!Nessuna porta disponibile!!RESET!
    echo.
    pause
    exit /b 1
)

REM ============================================
REM AVVIA SERVER SULLA PORTA TROVATA
REM ============================================
echo.
echo !CYAN!==========================================================!RESET!
echo   !BLUE![LOCALE]!RESET!     !MAGENTA!http://localhost:!PORT!/app/!RESET!
echo   !BLUE![RETE]!RESET!       !MAGENTA!http://!IP!:!PORT!/app/!RESET!
echo.
echo   !GRAY!Accessibile da qualsiasi dispositivo sulla stessa rete!RESET!
echo   !YELLOW!Chiudi questa finestra per fermare il server!RESET!
echo !CYAN!==========================================================!RESET!
echo.
echo   !GREEN![AVVIO]!RESET! !WHITE!Server in esecuzione con !PYTHON_CMD! sulla porta !PORT!!RESET!
echo.

REM Apri browser sulla porta corretta
start "" http://localhost:!PORT!/app/

REM Avvia il server
!PYTHON_CMD! -m http.server !PORT!

if errorlevel 1 (
    echo.
    echo   !RED![ERRORE]!RESET! !WHITE!Il server si e' chiuso con errore!RESET!
    echo.
    pause
)

endlocal