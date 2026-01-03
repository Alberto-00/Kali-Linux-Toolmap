@echo off
setlocal EnableDelayedExpansion

REM === INSTALLER SHORTCUT DESKTOP PER TOOLMAP ===

REM Palette colori (ANSI)
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

REM Ottieni percorso assoluto dello script
set "SCRIPT_DIR=%~dp0"

REM Vai alla directory del progetto e ottieni percorso assoluto
pushd "%SCRIPT_DIR%..\.."
set "PROJECT_DIR=%CD%"
popd

REM Percorsi
set "TARGET=%SCRIPT_DIR%start-server.bat"
set "ICON=%PROJECT_DIR%\app\favicon\favicon.ico"

REM Trova il vero percorso del Desktop (supporta OneDrive)
for /f "tokens=2*" %%a in ('reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders" /v Desktop 2^>nul') do set "DESKTOP_PATH=%%b"

if not defined DESKTOP_PATH set "DESKTOP_PATH=%USERPROFILE%\Desktop"

set "SHORTCUT=%DESKTOP_PATH%\Toolmap.lnk"

echo.
echo %CYAN%========================================%RESET%
echo %CYAN%%BOLD%  TOOLMAP - Installazione Desktop%RESET%
echo %CYAN%========================================%RESET%
echo.
echo   %BLUE%Target:%RESET%  %GRAY%%TARGET%%RESET%
echo   %BLUE%Icona:%RESET%   %GRAY%%ICON%%RESET%
echo   %BLUE%Desktop:%RESET% %GRAY%%DESKTOP_PATH%%RESET%
echo.

REM Verifica che il target esista
if not exist "%TARGET%" (
    echo   %RED%[ERRORE]%RESET% %WHITE%File non trovato: %TARGET%%RESET%
    pause
    exit /b 1
)

REM Verifica che il desktop esista
if not exist "%DESKTOP_PATH%" (
    echo   %RED%[ERRORE]%RESET% %WHITE%Desktop non trovato: %DESKTOP_PATH%%RESET%
    pause
    exit /b 1
)

REM Crea shortcut che punta a cmd.exe (così l'icona appare nella taskbar)
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT%');$s.TargetPath='cmd.exe';$s.Arguments='/c \"%TARGET%\"';$s.WorkingDirectory='%PROJECT_DIR%';$s.IconLocation='%ICON%';$s.Save()"

if exist "%SHORTCUT%" (
    echo   %GREEN%[OK]%RESET% %WHITE%Shortcut creato sul Desktop!%RESET%
    echo.
    echo   %MAGENTA%%SHORTCUT%%RESET%
    echo.
    echo   %YELLOW%Ora puoi:%RESET%
    echo   %GRAY%- Doppio click sull'icona per avviare%RESET%
    echo   %GRAY%- Click destro, "Mostra altre opzioni", "Aggiungi alla barra delle applicazioni"%RESET%
    echo.
) else (
    echo   %RED%[ERRORE]%RESET% %WHITE%Impossibile creare lo shortcut.%RESET%
    echo.
    echo   %YELLOW%Alternativa manuale:%RESET%
    echo   %GRAY%1. Click destro su start-server.bat%RESET%
    echo   %GRAY%2. "Crea collegamento"%RESET%
    echo   %GRAY%3. Sposta il collegamento sul Desktop%RESET%
    echo   %GRAY%4. Rinominalo "Toolmap"%RESET%
)

pause
endlocal
