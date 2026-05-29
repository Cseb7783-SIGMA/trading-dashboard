#!/bin/bash
# Trading Lab Dashboard — Démarrage
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Vérification installation ──────────────────────────────────────────────
if [ ! -d "$ROOT/backend/venv" ] || [ ! -d "$ROOT/frontend/node_modules" ]; then
  echo -e "${YELLOW}Installation manquante. Lancez d'abord : bash install.sh${NC}"
  exit 1
fi

if [ ! -f "$ROOT/.env" ]; then
  echo -e "${RED}Fichier .env manquant. Lancez d'abord : bash install.sh${NC}"
  exit 1
fi

# ── Chargement .env ───────────────────────────────────────────────────────
set -a
source "$ROOT/.env"
set +a

# ── Détection port libre backend ───────────────────────────────────────────
find_port() {
  python3 -c "
import socket
for p in range(8000, 8100):
    with socket.socket() as s:
        if s.connect_ex(('localhost', p)) != 0:
            print(p); break
"
}

PORT=$(find_port)
echo "$PORT" > "$ROOT/.port"

# ── Port frontend ──────────────────────────────────────────────────────────
find_frontend_port() {
  python3 -c "
import socket
for p in range(3000, 3020):
    with socket.socket() as s:
        if s.connect_ex(('localhost', p)) != 0:
            print(p); break
"
}
FRONTEND_PORT=$(find_frontend_port)

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║      Trading Lab Dashboard               ║"
echo "║           CZ Consulting                  ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Backend ────────────────────────────────────────────────────────────────
echo -e "${BLUE}→ Démarrage backend (port $PORT)...${NC}"
cd "$ROOT/backend"
source venv/bin/activate

PORT=$PORT \
RUNS_DIR="${RUNS_DIR}" \
STRATEGY_REGISTRY_DIR="${STRATEGY_REGISTRY_DIR:-$ROOT/strategies/registry}" \
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}" \
uvicorn main:app --host 0.0.0.0 --port "$PORT" > /tmp/trading-backend.log 2>&1 &
BACKEND_PID=$!

# Attendre que le backend réponde
for i in $(seq 1 15); do
  if curl -s "http://localhost:$PORT/health" > /dev/null 2>&1; then
    RUNS_COUNT=$(curl -s "http://localhost:$PORT/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('total_runs',0))" 2>/dev/null || echo "?")
    echo -e "${GREEN}  ✓ Backend actif — $RUNS_COUNT runs détectés${NC}"
    break
  fi
  sleep 1
done

# ── Frontend ───────────────────────────────────────────────────────────────
echo -e "${BLUE}→ Démarrage frontend (port $FRONTEND_PORT)...${NC}"
cd "$ROOT/frontend"

NEXT_PUBLIC_BACKEND_URL="http://localhost:$PORT" \
PORT=$FRONTEND_PORT \
npm run dev > /tmp/trading-frontend.log 2>&1 &
FRONTEND_PID=$!

# Attendre Next.js
for i in $(seq 1 20); do
  if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
    echo -e "${GREEN}  ✓ Frontend actif${NC}"
    break
  fi
  sleep 1
done

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Dashboard → http://localhost:$FRONTEND_PORT${NC}"
echo -e "${GREEN}  API       → http://localhost:$PORT${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}  Ctrl+C pour arrêter${NC}\n"

# Ouvrir dans le navigateur (Mac)
sleep 1 && open "http://localhost:$FRONTEND_PORT" 2>/dev/null &

trap "
  echo -e '\n${YELLOW}Arrêt du dashboard...${NC}'
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo -e '${GREEN}Terminé.${NC}'
  exit 0
" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
