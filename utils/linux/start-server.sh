#!/bin/bash

# ============================================
# PALETTE COLORI (ANSI)
# ============================================
# Ciano chiaro  = Header/Titoli
# Blu chiaro    = Label/Info
# Verde chiaro  = Successo/OK
# Giallo chiaro = Warning
# Rosso chiaro  = Errore
# Magenta       = URL/Accent (Kali-style)
# Bianco        = Testo normale
# Grigio        = Testo secondario

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

# Ottieni il percorso assoluto della directory del progetto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_DIR"

# Funzione di cleanup per terminare il server alla chiusura
cleanup() {
    echo ""
    echo -e "${YELLOW}Arresto del server...${NC}"
    pkill -f "python.*http.server.*8000" 2>/dev/null
    pkill -f "python3.*http.server.*8000" 2>/dev/null
    echo -e "${GREEN}[OK]${NC} ${WHITE}Server fermato.${NC}"
    exit 0
}

# Intercetta segnali di chiusura (CTRL+C, chiusura finestra, etc.)
trap cleanup SIGINT SIGTERM SIGHUP EXIT

clear

echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}${BOLD}      TOOLMAP REGISTRY SERVER${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# Attiva conda base se disponibile (safe anche se già attivo)
if [ -f "$HOME/miniconda3/bin/activate" ]; then
    source "$HOME/miniconda3/bin/activate" base 2>/dev/null
elif [ -f "$HOME/anaconda3/bin/activate" ]; then
    source "$HOME/anaconda3/bin/activate" base 2>/dev/null
fi

# Trova IP locale (funziona su Linux e Mac)
if command -v hostname &> /dev/null; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

# Fallback per Mac
if [ -z "$IP" ] || [ "$IP" = "" ]; then
    IP=$(ipconfig getifaddr en0 2>/dev/null)
fi

# Fallback generico
if [ -z "$IP" ] || [ "$IP" = "" ]; then
    IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -1)
fi

# Se ancora non trovato
if [ -z "$IP" ] || [ "$IP" = "" ]; then
    IP="Non disponibile"
fi

echo -e "  ${BLUE}[LOCALE]${NC}     ${MAGENTA}http://localhost:8000/app/${NC}"
echo -e "  ${BLUE}[RETE]${NC}       ${MAGENTA}http://$IP:8000/app/${NC}"
echo ""
echo -e "  ${GRAY}Accessibile da qualsiasi dispositivo sulla stessa rete${NC}"
echo -e "  ${YELLOW}Chiudi questa finestra per fermare il server${NC}"
echo ""
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "  ${GREEN}[OK]${NC} ${WHITE}Server in avvio...${NC}"
echo ""

# Apri browser automaticamente (background)
sleep 2 && {
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8000/app/ 2>/dev/null &
    elif command -v open &> /dev/null; then
        open http://localhost:8000/app/ &
    elif command -v gnome-open &> /dev/null; then
        gnome-open http://localhost:8000/app/ &
    fi
} &

# Avvia server Python (prova python3, poi python)
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m http.server 8000
else
    echo ""
    echo -e "  ${RED}[ERRORE]${NC} ${WHITE}Python non trovato!${NC}"
    echo -e "  ${GRAY}Installa Python 3 per utilizzare questo server.${NC}"
    echo ""
    read -p "Premi INVIO per uscire..."
    exit 1
fi
