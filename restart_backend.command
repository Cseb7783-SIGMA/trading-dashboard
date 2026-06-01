#!/bin/bash
# Double-clique ce fichier dans le Finder pour relancer le backend.
# (Si macOS bloque : clic-droit → Ouvrir → Ouvrir)

cd "$(dirname "$0")/backend" || exit 1

echo "🔪 Tue les vieux uvicorn..."
pkill -9 -f uvicorn 2>/dev/null
sleep 1

echo "🔧 Active venv..."
source venv/bin/activate || { echo "❌ venv introuvable"; exit 1; }

# Vérif des dépendances critiques (S59 : yfinance pour /price/{symbol})
echo "📦 Vérif dépendances..."
python3 -c "import yfinance" 2>/dev/null || {
    echo "    → installation yfinance + pandas..."
    pip install --quiet yfinance pandas 2>&1 | tail -3
}
python3 -c "import fastapi, uvicorn" 2>/dev/null || {
    echo "    → installation fastapi + uvicorn..."
    pip install --quiet fastapi uvicorn 2>&1 | tail -3
}

echo "🚀 Démarre uvicorn sur port 8000..."
echo "    (Garde cette fenêtre ouverte — ferme-la pour stopper le backend)"
echo ""
exec uvicorn main:app --port 8000
