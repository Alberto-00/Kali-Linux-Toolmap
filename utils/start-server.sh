#!/bin/bash

# Colori
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${GREEN}=========================================${NC}"
echo -e "${CYAN}   TOOLMAP REGISTRY SERVER${NC}"
echo -e "${GREEN}=========================================${NC}"
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

echo -e "${YELLOW}[LOCALE]${NC}     http://localhost:8000/"
echo -e "${YELLOW}[RETE]${NC}       http://$IP:8000/"
echo ""
echo "Accessibile da qualsiasi dispositivo sulla stessa rete"
echo -e "${CYAN}Premi CTRL+C per fermare il server${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Vai alla root del progetto (parent di utils/)
cd "$(dirname "$0")/.."

# Apri browser automaticamente (background)
sleep 2 && {
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:8000/app/ &
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
    echo -e "${RED}ERRORE: Python non trovato!${NC}"
    echo "Installa Python 3 per utilizzare questo server."
    read -p "Premi INVIO per uscire..."
    exit 1
fi