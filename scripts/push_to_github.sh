#!/usr/bin/env bash
set -euo pipefail
# Uso: ./push_to_github.sh NOMBRE_REPO
REPO_NAME="${1:-}"
if [ -z "$REPO_NAME" ]; then
  echo "Uso: $0 NOMBRE_REPO"
  exit 1
fi

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  git init
  echo "Repositorio git inicializado."
fi

git add --all
git commit -m "Añadir/actualizar prototipo caída libre" || true

if git remote | grep -q '^origin$'; then
  ORIGIN_URL=$(git remote get-url origin)
  echo "Remote 'origin' ya existe: $ORIGIN_URL"
  echo "Empujando a origin main..."
  git branch -M main || true
  git push -u origin main
  echo "Push completado."
  exit 0
fi

if command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    echo "Creando repo en GitHub y empujando (gh CLI)..."
    gh repo create "$REPO_NAME" --public --source . --remote origin --push
    echo "Repositorio creado y empujado a GitHub: $REPO_NAME"
    exit 0
  else
    echo "gh CLI encontrado pero no autenticado. Ejecuta: gh auth login"
    exit 1
  fi
fi

echo "gh CLI no encontrado. Por favor crea el repo en GitHub y ejecuta estos comandos:"
echo "  git remote add origin git@github.com:TU_USUARIO/$REPO_NAME.git"
echo "  git branch -M main"
echo "  git push -u origin main"
exit 1
