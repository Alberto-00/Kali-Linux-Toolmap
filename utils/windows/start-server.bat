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
REM TROVA IP LOCALE (VPN-safe)
REM Preferisce IP LAN (192.168.x.x, 172.16-31.x.x)
REM rispetto a IP VPN (10.x.x.x, altri range)
REM ============================================
set "IP=localhost"
set "IP_VPN="

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set "CANDIDATE=%%a"
    set "CANDIDATE=!CANDIDATE: =!"

    REM Controlla se è un IP LAN (192.168.x.x)
    echo !CANDIDATE! | findstr /b "192.168." >nul 2>&1
    if !errorlevel! equ 0 (
        if "!IP!"=="localhost" (
            set "IP=!CANDIDATE!"
        )
    ) else (
        REM Controlla se è un IP LAN (172.16-31.x.x)
        echo !CANDIDATE! | findstr /b "172." >nul 2>&1
        if !errorlevel! equ 0 (
            if "!IP!"=="localhost" (
                set "IP=!CANDIDATE!"
            )
        ) else (
            REM Salva come fallback VPN (10.x.x.x o altro)
            if "!IP_VPN!"=="" set "IP_VPN=!CANDIDATE!"
        )
    )
)

REM Se non trovato IP LAN, usa IP VPN come fallback
if "!IP!"=="localhost" if not "!IP_VPN!"=="" (
    set "IP=!IP_VPN!"
)

REM ============================================
REM TROVA PRIMA PORTA LIBERA (test bind reale con Python, rileva anche porte riservate da Hyper-V)
REM ============================================
set "PORT=0"

for %%p in (8000 3000 5000 8080 8001 8888 9000 4000 7000 7777 9090 9191 9292 9393) do (
    if !PORT! equ 0 (
        !PYTHON_CMD! -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind(('127.0.0.1',%%p)); s.close(); sys.exit(0)" >nul 2>&1
        if !errorlevel! equ 0 (
            set "PORT=%%p"
            echo   !GREEN![OK]!RESET! !WHITE!Porta %%p disponibile!!RESET!
        ) else (
            echo   !RED![X]!RESET! !GRAY!Porta %%p occupata o riservata!RESET!
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

REM Pre-test: verifica se 0.0.0.0 è accessibile prima di avviare il server
set "BIND_ADDR=0.0.0.0"
!PYTHON_CMD! -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind(('0.0.0.0',!PORT!)); s.close()" >nul 2>&1
if !errorlevel! neq 0 set "BIND_ADDR=127.0.0.1"

echo.
echo !CYAN!==========================================================!RESET!
echo   !BLUE![LOCALE]!RESET!     !MAGENTA!http://localhost:!PORT!/app/!RESET!
if "!BIND_ADDR!"=="0.0.0.0" (
    echo   !BLUE![RETE]!RESET!       !MAGENTA!http://!IP!:!PORT!/app/!RESET!
    echo.
    echo   !GRAY!Accessibile da qualsiasi dispositivo sulla stessa rete!RESET!
) else (
    echo   !YELLOW![NOTA]!RESET!     !GRAY!Accesso da rete non disponibile ^(VPN/firewall attivo^)!RESET!
)
echo   !YELLOW!Chiudi questa finestra per fermare il server!RESET!
echo !CYAN!==========================================================!RESET!
echo.
echo   !GREEN![AVVIO]!RESET! !WHITE!Server in esecuzione con !PYTHON_CMD! sulla porta !PORT! ^(!BIND_ADDR!^)!RESET!
echo.

REM Apri browser sulla porta corretta
start "" http://localhost:!PORT!/app/

REM Avvia il server con l'indirizzo verificato
!PYTHON_CMD! -m http.server !PORT! --bind !BIND_ADDR!

if errorlevel 1 (
    echo.
    echo   !RED![ERRORE]!RESET! !WHITE!Il server si e' chiuso con errore!RESET!
    echo   !GRAY!Prova ad eseguire il .bat come Amministratore.!RESET!
    echo.
    pause
)

endlocal
