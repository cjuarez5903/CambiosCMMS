#!/bin/bash
# ============================================================
# Genera los íconos PNG para PWA desde el logo SVG de MRB
# Requiere: ImageMagick (sudo apt install imagemagick)
# Ejecutar desde: frontend/public/icons/
#   bash create-icons.sh
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Descargando logo SVG de MRB..."
curl -s -o logo.svg "https://www.mrbstorage.com/imgs/logo.svg"

if [ ! -f logo.svg ] || [ ! -s logo.svg ]; then
  echo "ERROR: No se pudo descargar el logo. Revisa conexión o URL."
  exit 1
fi

echo "Generando PNGs con fondo azul MRB (#2e3c98)..."

# 180x180 para iOS apple-touch-icon
convert -background "#2e3c98" -resize 140x140 -gravity center -extent 180x180 logo.svg icon-180.png
echo "  ✓ icon-180.png"

# 192x192 para Android/PWA
convert -background "#2e3c98" -resize 150x150 -gravity center -extent 192x192 logo.svg icon-192.png
echo "  ✓ icon-192.png"

# 512x512 para splash screen PWA
convert -background "#2e3c98" -resize 400x400 -gravity center -extent 512x512 logo.svg icon-512.png
echo "  ✓ icon-512.png"

echo ""
echo "✅ Íconos generados. Puedes borrar logo.svg si quieres."
