#!/bin/bash

# === INSTALLER SHORTCUT DESKTOP PER TOOLMAP ===
# Crea un'icona desktop e nel menu applicazioni

# Palette colori (ANSI)
CYAN='\033[96m'
BLUE='\033[94m'
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
MAGENTA='\033[95m'
WHITE='\033[97m'
GRAY='\033[90m'
BOLD='\033[1m'
NC='\033[0m'

# Percorsi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
EXEC_PATH="$SCRIPT_DIR/start-server.sh"
ICON_PATH="$PROJECT_DIR/app/favicon/favicon-96x96.png"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}${BOLD}  TOOLMAP - Installazione Desktop${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Assicurati che lo script sia eseguibile
chmod +x "$EXEC_PATH"

echo -e "  ${BLUE}Target:${NC}  ${GRAY}$EXEC_PATH${NC}"
echo -e "  ${BLUE}Icona:${NC}   ${GRAY}$ICON_PATH${NC}"
echo ""

# Crea il file .desktop con i percorsi corretti
DESKTOP_CONTENT="[Desktop Entry]
Version=1.0
Type=Application
Name=Toolmap
GenericName=Security Tools Registry
Comment=Avvia Toolmap Registry Server
Exec=$EXEC_PATH
Icon=$ICON_PATH
Terminal=true
Categories=Development;Security;Network;
Keywords=security;tools;kali;pentest;
StartupNotify=true"

# Installa nel menu applicazioni
APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"
echo "$DESKTOP_CONTENT" > "$APPS_DIR/toolmap.desktop"
chmod +x "$APPS_DIR/toolmap.desktop"
echo -e "  ${GREEN}[OK]${NC} ${WHITE}Aggiunto al menu applicazioni${NC}"

# Aggiorna database applicazioni
update-desktop-database "$APPS_DIR" 2>/dev/null

echo ""
echo -e "  ${GREEN}[OK]${NC} ${WHITE}Installazione completata!${NC}"
echo ""
echo -e "  ${YELLOW}Ora puoi:${NC}"
echo -e "  ${GRAY}- Cercare 'Toolmap' nel menu applicazioni${NC}"
echo -e "  ${GRAY}- Click destro > 'Aggiungi ai preferiti' per la dock${NC}"
echo ""

# Se GNOME, suggerisci
if command -v gnome-shell &> /dev/null; then
    echo -e "  ${MAGENTA}Suggerimento GNOME:${NC}"
    echo -e "  ${GRAY}Cerca 'Toolmap' nella overview (Super key)${NC}"
    echo -e "  ${GRAY}Click destro sull'icona > 'Aggiungi ai preferiti'${NC}"
    echo ""
fi
