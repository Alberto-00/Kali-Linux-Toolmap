#!/bin/bash

# ============================================
# PALETTE COLORI (ANSI)
# ============================================
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

# Variabile per la porta effettiva e PID del server
ACTIVE_PORT=0
SERVER_PID=""

# Funzione di cleanup per terminare il server alla chiusura
cleanup() {
    echo ""
    echo -e "${YELLOW}Arresto del server...${NC}"
    if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
        kill "$SERVER_PID" 2>/dev/null
        wait "$SERVER_PID" 2>/dev/null
    fi
    echo -e "${GREEN}[OK]${NC} ${WHITE}Server fermato.${NC}"
    exit 0
}

# Intercetta segnali di chiusura (CTRL+C, chiusura finestra, etc.)
trap cleanup SIGINT SIGTERM SIGHUP EXIT

clear

echo ""
echo -e "${CYAN}===========================================================${NC}"
echo -e "${CYAN}${BOLD}                  TOOLMAP REGISTRY SERVER${NC}"
echo -e "${CYAN}===========================================================${NC}"
echo ""

# Attiva conda base se disponibile (safe anche se già attivo)
if [ -f "$HOME/miniconda3/bin/activate" ]; then
    source "$HOME/miniconda3/bin/activate" base 2>/dev/null
elif [ -f "$HOME/anaconda3/bin/activate" ]; then
    source "$HOME/anaconda3/bin/activate" base 2>/dev/null
fi

# ============================================
# RILEVA PYTHON
# ============================================
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo ""
    echo -e "  ${RED}[ERRORE]${NC} ${WHITE}Python non trovato!${NC}"
    echo -e "  ${GRAY}Installa Python 3 per utilizzare questo server.${NC}"
    echo ""
    read -p "Premi INVIO per uscire..."
    exit 1
fi

# ============================================
# TROVA IP LOCALE (VPN-safe)
# Preferisce IP LAN (esclude interfacce VPN: tun*, tap*, wg*, ppp*)
# ============================================
IP=""

# Prova a ottenere IP dalla interfaccia LAN principale (escludi VPN)
if command -v ip &> /dev/null; then
    # Escludi interfacce VPN (tun, tap, wg, ppp)
    IP=$(ip -4 addr show scope global | grep -v -E 'tun[0-9]|tap[0-9]|wg[0-9]|ppp[0-9]' | grep "inet " | head -1 | awk '{print $2}' | cut -d/ -f1)
fi

# Fallback: hostname -I (prendi il primo IP non-VPN)
if [ -z "$IP" ] && command -v hostname &> /dev/null; then
    for addr in $(hostname -I 2>/dev/null); do
        # Preferisci 192.168.x.x o 172.16-31.x.x
        if echo "$addr" | grep -qE '^192\.168\.' || echo "$addr" | grep -qE '^172\.(1[6-9]|2[0-9]|3[01])\.'; then
            IP="$addr"
            break
        fi
    done
    # Se ancora vuoto, prendi il primo qualsiasi
    if [ -z "$IP" ]; then
        IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi
fi

# Fallback per macOS
if [ -z "$IP" ]; then
    IP=$(ipconfig getifaddr en0 2>/dev/null)
fi

# Se ancora non trovato
if [ -z "$IP" ]; then
    IP="Non disponibile"
fi

# ============================================
# TROVA PRIMA PORTA LIBERA
# ============================================
for port in 8000 3000 5000 8080 8001 8888 9000 4000; do
    if [ "$ACTIVE_PORT" -eq 0 ]; then
        # Verifica se la porta è occupata
        IN_USE=0
        if command -v ss &> /dev/null; then
            ss -tln 2>/dev/null | grep -q ":${port} " && IN_USE=1
        elif command -v netstat &> /dev/null; then
            netstat -tln 2>/dev/null | grep -q ":${port} " && IN_USE=1
        elif command -v lsof &> /dev/null; then
            lsof -i ":${port}" -sTCP:LISTEN &>/dev/null && IN_USE=1
        fi

        if [ "$IN_USE" -eq 0 ]; then
            ACTIVE_PORT=$port
            echo -e "  ${GREEN}[OK]${NC} ${WHITE}Porta $port disponibile!${NC}"
        else
            echo -e "  ${RED}[X]${NC} ${GRAY}Porta $port occupata${NC}"
        fi
    fi
done

if [ "$ACTIVE_PORT" -eq 0 ]; then
    echo ""
    echo -e "  ${RED}[ERRORE]${NC} ${WHITE}Nessuna porta disponibile!${NC}"
    echo ""
    read -p "Premi INVIO per uscire..."
    exit 1
fi

# ============================================
# TEST BIND ADDRESS E AVVIO SERVER
# ============================================

# Pre-test: verifica se 0.0.0.0 è accessibile (VPN/firewall potrebbero bloccarlo)
BIND_ADDR="0.0.0.0"
if ! $PYTHON_CMD -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind(('0.0.0.0',$ACTIVE_PORT)); s.close()" 2>/dev/null; then
    BIND_ADDR="127.0.0.1"
fi

echo ""
echo -e "${CYAN}===========================================================${NC}"
echo -e "  ${BLUE}[LOCALE]${NC}     ${MAGENTA}http://localhost:${ACTIVE_PORT}/app/${NC}"
if [ "$BIND_ADDR" = "0.0.0.0" ]; then
    echo -e "  ${BLUE}[RETE]${NC}       ${MAGENTA}http://$IP:${ACTIVE_PORT}/app/${NC}"
    echo ""
    echo -e "  ${GRAY}Accessibile da qualsiasi dispositivo sulla stessa rete${NC}"
else
    echo -e "  ${YELLOW}[NOTA]${NC}      ${GRAY}Accesso da rete non disponibile (VPN/firewall attivo)${NC}"
fi
echo -e "  ${YELLOW}Chiudi questa finestra per fermare il server${NC}"
echo ""
echo -e "${CYAN}===========================================================${NC}"
echo ""
echo -e "  ${GREEN}[OK]${NC} ${WHITE}Server in avvio sulla porta ${ACTIVE_PORT} (${BIND_ADDR})...${NC}"
echo ""

# Apri browser automaticamente (background)
sleep 2 && {
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:${ACTIVE_PORT}/app/" 2>/dev/null &
    elif command -v open &> /dev/null; then
        open "http://localhost:${ACTIVE_PORT}/app/" &
    elif command -v gnome-open &> /dev/null; then
        gnome-open "http://localhost:${ACTIVE_PORT}/app/" &
    fi
} &

# Avvia server Python con l'indirizzo verificato
$PYTHON_CMD -m http.server "$ACTIVE_PORT" --bind "$BIND_ADDR" &
SERVER_PID=$!

# Verifica avvio corretto (il bind test precedente dovrebbe garantirlo)
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo -e "  ${RED}[ERRORE]${NC} ${WHITE}Impossibile avviare il server.${NC}"
    echo -e "  ${GRAY}Prova a eseguire lo script con sudo.${NC}"
    echo ""
    read -p "Premi INVIO per uscire..."
    exit 1
fi

# Attendi il processo server (permette a trap di intercettare i segnali)
wait "$SERVER_PID"
