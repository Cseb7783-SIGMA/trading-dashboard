#!/bin/bash
# Trading Lab Dashboard — Installation complète (Mac)
# Usage : bash install.sh
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║   Trading Lab Dashboard — Installation   ║"
echo "║            CZ Consulting                 ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Vérification prérequis ─────────────────────────────────────────────
echo -e "${BLUE}[1/5] Vérification des prérequis...${NC}"

# Python 3.10+
PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3; do
  if command -v "$cmd" &>/dev/null; then
    VER=$("$cmd" -c "import sys; print(sys.version_info >= (3,10))")
    if [ "$VER" = "True" ]; then
      PYTHON="$cmd"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo -e "${RED}✗ Python 3.10+ requis. Installez via : brew install python@3.12${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Python : $($PYTHON --version)${NC}"

# Node.js 18+
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗ Node.js requis. Installez via : brew install node${NC}"
  exit 1
fi
NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>/dev/null && echo "OK" || echo "FAIL")
if [ "$NODE_VER" = "FAIL" ]; then
  echo -e "${RED}✗ Node.js 18+ requis (actuel : $(node --version))${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Node.js : $(node --version)${NC}"

# npm
if ! command -v npm &>/dev/null; then
  echo -e "${RED}✗ npm requis${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ npm : $(npm --version)${NC}"

# ── 2. Configuration .env ────────────────────────────────────────────────
echo -e "\n${BLUE}[2/5] Configuration...${NC}"

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
fi

# RUNS_DIR
CURRENT_RUNS=$(grep "^RUNS_DIR=" "$ROOT/.env" | cut -d'=' -f2-)
echo -e "${YELLOW}  Chemin vers results/runs/ du trading-lab${NC}"
echo -e "  Actuel : ${CURRENT_RUNS:-non configuré}"
read -r -p "  Nouveau chemin (Entrée pour garder l'actuel) : " NEW_RUNS
if [ -n "$NEW_RUNS" ]; then
  sed -i '' "s|^RUNS_DIR=.*|RUNS_DIR=$NEW_RUNS|" "$ROOT/.env"
  RUNS_DIR="$NEW_RUNS"
else
  RUNS_DIR="$CURRENT_RUNS"
fi

if [ ! -d "$RUNS_DIR" ]; then
  echo -e "${YELLOW}  ⚠ Dossier introuvable : $RUNS_DIR (le dashboard démarrera quand même)${NC}"
else
  COUNT=$(ls "$RUNS_DIR" 2>/dev/null | wc -l | tr -d ' ')
  echo -e "${GREEN}  ✓ $COUNT runs détectés${NC}"
fi

# ANTHROPIC_API_KEY
CURRENT_KEY=$(grep "^ANTHROPIC_API_KEY=" "$ROOT/.env" | cut -d'=' -f2-)
if [ -z "$CURRENT_KEY" ] || [ "$CURRENT_KEY" = "sk-ant-..." ]; then
  read -r -p "  Clé API Anthropic (optionnel — pour l'assistant IA) : " NEW_KEY
  if [ -n "$NEW_KEY" ]; then
    sed -i '' "s|^ANTHROPIC_API_KEY=.*|ANTHROPIC_API_KEY=$NEW_KEY|" "$ROOT/.env"
  fi
else
  echo -e "${GREEN}  ✓ Clé Anthropic configurée${NC}"
fi

# ── 3. Backend Python ─────────────────────────────────────────────────────
echo -e "\n${BLUE}[3/5] Installation backend Python...${NC}"
cd "$ROOT/backend"

if [ ! -d venv ]; then
  echo "  Création du virtualenv..."
  $PYTHON -m venv venv
fi

source venv/bin/activate
echo "  Installation des dépendances..."
pip install -r requirements.txt -q --disable-pip-version-check
echo -e "${GREEN}  ✓ Backend prêt${NC}"

# ── 4. Frontend Next.js ────────────────────────────────────────────────────
echo -e "\n${BLUE}[4/5] Installation frontend Next.js...${NC}"
cd "$ROOT/frontend"
echo "  npm install (peut prendre 1-2 minutes)..."
npm install --legacy-peer-deps -q 2>/dev/null || npm install --legacy-peer-deps
echo -e "${GREEN}  ✓ Frontend prêt${NC}"

# ── 5. Vérification finale ────────────────────────────────────────────────
echo -e "\n${BLUE}[5/5] Vérification finale...${NC}"
cd "$ROOT/backend"
source venv/bin/activate
python3 -c "import fastapi, uvicorn, watchdog, pandas, pydantic; print('  ✓ Modules Python OK')"
cd "$ROOT/frontend"
node -e "require('./node_modules/next/package.json'); console.log('  ✓ Next.js OK')"

echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║         Installation terminée !          ║"
echo "║                                          ║"
echo "║  Pour démarrer :                         ║"
echo "║    bash start.sh                         ║"
echo "║                                          ║"
echo "║  Dashboard → http://localhost:3000       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
