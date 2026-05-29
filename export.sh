#!/bin/bash
# Trading Lab Dashboard — Création de l'archive exportable
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
EXPORT_NAME="trading-dashboard-$(date +%Y%m%d)"
EXPORT_DIR="/tmp/$EXPORT_NAME"
OUTPUT="$ROOT/../$EXPORT_NAME.zip"

echo "→ Préparation de l'archive..."

# Nettoyage
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# Copie sélective (sans node_modules, venv, .next, .env, logs)
rsync -a \
  --exclude="backend/venv" \
  --exclude="frontend/node_modules" \
  --exclude="frontend/.next" \
  --exclude="frontend/logs" \
  --exclude=".env" \
  --exclude=".port" \
  --exclude="*.log" \
  --exclude=".DS_Store" \
  --exclude="__pycache__" \
  --exclude="*.pyc" \
  "$ROOT/" "$EXPORT_DIR/"

# S'assurer que .env.example est bien là
if [ -f "$ROOT/.env.example" ]; then
  cp "$ROOT/.env.example" "$EXPORT_DIR/.env.example"
fi

# Rendre les scripts exécutables
chmod +x "$EXPORT_DIR/install.sh"
chmod +x "$EXPORT_DIR/start.sh"
chmod +x "$EXPORT_DIR/export.sh"

# Créer le zip
cd /tmp
zip -r "$OUTPUT" "$EXPORT_NAME" -q

# Nettoyage
rm -rf "$EXPORT_DIR"

SIZE=$(du -sh "$OUTPUT" | cut -f1)
echo ""
echo "✓ Archive créée : $OUTPUT"
echo "  Taille : $SIZE"
echo ""
echo "Instructions pour l'autre Mac :"
echo "  1. Copier le .zip sur le Mac cible"
echo "  2. Double-cliquer pour décompresser"
echo "  3. Dans le terminal : cd trading-dashboard-* && bash install.sh"
echo "  4. Puis : bash start.sh"
