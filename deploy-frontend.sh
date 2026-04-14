#!/bin/bash
# ============================================================
# DEPLOY FRONTEND — MRB CMMS
# Uso: bash ~/CambiosCMMS/deploy-frontend.sh
# ============================================================

CAMBIOS=~/CambiosCMMS
FRONTEND=~/cmms-frontend
FRONTEND_BACKUP=~/cmms-frontend-backup-$(date +%Y%m%d_%H%M%S)

echo "======================================================"
echo " MRB CMMS — Deploy Frontend"
echo "======================================================"

# ── ACTUALIZAR REPO ───────────────────────────────────────
echo ""
echo "[1/4] Actualizando repo desde GitHub..."
cd $CAMBIOS
git fetch origin && git reset --hard origin/main
echo "      ✓ Repo actualizado"

# ── BACKUP FRONTEND ───────────────────────────────────────
echo ""
echo "[2/4] Creando backup del frontend actual..."
cp -r $FRONTEND $FRONTEND_BACKUP
echo "      ✓ Backup en: $FRONTEND_BACKUP"
echo ""
echo "      Si algo falla, restaura con:"
echo "        rm -rf $FRONTEND"
echo "        cp -r $FRONTEND_BACKUP $FRONTEND"
echo "        cd $FRONTEND && npm run build"

# ── COPIAR ARCHIVOS ───────────────────────────────────────
echo ""
echo "[3/4] Copiando archivos al frontend..."

copiar_fe() {
  local src=$1 dst=$2
  mkdir -p "$(dirname $dst)"
  cp "$CAMBIOS/frontend/$src" "$dst"
  echo "      ✓ $src"
}

copiar_fe App.tsx                              $FRONTEND/App.tsx
copiar_fe index.tsx                            $FRONTEND/index.tsx
copiar_fe types.ts                             $FRONTEND/types.ts
copiar_fe constants.ts                         $FRONTEND/constants.ts
copiar_fe pages/PlantaTratamiento.tsx          $FRONTEND/pages/PlantaTratamiento.tsx
copiar_fe pages/ITDashboard.tsx                $FRONTEND/pages/ITDashboard.tsx
copiar_fe pages/ITSoluciones.tsx               $FRONTEND/pages/ITSoluciones.tsx
copiar_fe pages/ITAssignedTickets.tsx          $FRONTEND/pages/ITAssignedTickets.tsx
copiar_fe pages/Users.tsx                      $FRONTEND/pages/Users.tsx
copiar_fe pages/Dashboard.tsx                  $FRONTEND/pages/Dashboard.tsx
copiar_fe pages/Login.tsx                      $FRONTEND/pages/Login.tsx
copiar_fe components/Sidebar.tsx               $FRONTEND/components/Sidebar.tsx
copiar_fe components/Layout.tsx                $FRONTEND/components/Layout.tsx
copiar_fe components/ITMobileTicketCard.tsx    $FRONTEND/components/ITMobileTicketCard.tsx
copiar_fe components/ConfirmModal.tsx          $FRONTEND/components/ConfirmModal.tsx
copiar_fe components/Modal.tsx                 $FRONTEND/components/Modal.tsx
copiar_fe src/services/planta-tratamiento.service.ts $FRONTEND/src/services/planta-tratamiento.service.ts
copiar_fe src/services/it-tickets.service.ts  $FRONTEND/src/services/it-tickets.service.ts
copiar_fe src/services/api.ts                  $FRONTEND/src/services/api.ts
copiar_fe src/services/roles.service.ts        $FRONTEND/src/services/roles.service.ts
copiar_fe src/services/usuarios.service.ts     $FRONTEND/src/services/usuarios.service.ts
copiar_fe src/context/AuthContext.tsx          $FRONTEND/src/context/AuthContext.tsx
copiar_fe src/context/NotificationsContext.tsx $FRONTEND/src/context/NotificationsContext.tsx
copiar_fe src/components/PermissionRoute.tsx   $FRONTEND/src/components/PermissionRoute.tsx
copiar_fe src/components/ProtectedRoute.tsx    $FRONTEND/src/components/ProtectedRoute.tsx
copiar_fe src/utils/accessControl.ts          $FRONTEND/src/utils/accessControl.ts
copiar_fe src/styles/it-mobile.css            $FRONTEND/src/styles/it-mobile.css
copiar_fe src/components/ChartCard.tsx        $FRONTEND/src/components/ChartCard.tsx
copiar_fe src/components/charts/SimplePieChart.tsx   $FRONTEND/src/components/charts/SimplePieChart.tsx
copiar_fe src/components/charts/SimpleBarChart.tsx   $FRONTEND/src/components/charts/SimpleBarChart.tsx
copiar_fe src/components/charts/SimpleTrendChart.tsx $FRONTEND/src/components/charts/SimpleTrendChart.tsx
copiar_fe components/StatCard.tsx                         $FRONTEND/components/StatCard.tsx
copiar_fe components/HistorialOrden.tsx                   $FRONTEND/components/HistorialOrden.tsx
copiar_fe pages/WorkOrders.tsx                            $FRONTEND/pages/WorkOrders.tsx
copiar_fe src/services/ordenes-trabajo.service.ts         $FRONTEND/src/services/ordenes-trabajo.service.ts

# ── PWA ───────────────────────────────────────────────────
echo ""
echo "[3b/4] Copiando archivos PWA..."
mkdir -p $FRONTEND/public/icons
cp $CAMBIOS/frontend/index.html                          $FRONTEND/index.html;                        echo "      ✓ index.html (PWA)"
cp $CAMBIOS/frontend/public/manifest.json                $FRONTEND/public/manifest.json;              echo "      ✓ manifest.json"
cp $CAMBIOS/frontend/public/favicon.ico                  $FRONTEND/public/favicon.ico;                echo "      ✓ favicon.ico"
cp $CAMBIOS/frontend/public/apple-touch-icon.png         $FRONTEND/public/apple-touch-icon.png;       echo "      ✓ apple-touch-icon.png"
cp $CAMBIOS/frontend/public/apple-touch-icon-v2.png      $FRONTEND/public/apple-touch-icon-v2.png;    echo "      ✓ apple-touch-icon-v2.png"
cp $CAMBIOS/frontend/public/apple-touch-icon-v3.png      $FRONTEND/public/apple-touch-icon-v3.png;    echo "      ✓ apple-touch-icon-v3.png (iOS activo)"
cp $CAMBIOS/frontend/public/icons/icon-180.png           $FRONTEND/public/icons/icon-180.png;         echo "      ✓ icon-180.png (iOS)"
cp $CAMBIOS/frontend/public/icons/icon-192.png           $FRONTEND/public/icons/icon-192.png;         echo "      ✓ icon-192.png"
cp $CAMBIOS/frontend/public/icons/icon-192-maskable.png  $FRONTEND/public/icons/icon-192-maskable.png; echo "      ✓ icon-192-maskable.png"
cp $CAMBIOS/frontend/public/icons/icon-512.png           $FRONTEND/public/icons/icon-512.png;         echo "      ✓ icon-512.png"
cp $CAMBIOS/frontend/public/icons/icon-512-maskable.png  $FRONTEND/public/icons/icon-512-maskable.png; echo "      ✓ icon-512-maskable.png"

# ── BUILD ─────────────────────────────────────────────────
echo ""
echo "[4/4] Build del frontend..."
cd $FRONTEND
npm install --silent
npm run build

# iOS requiere apple-touch-icon en dist/ directamente
cp $FRONTEND/public/apple-touch-icon.png $FRONTEND/dist/apple-touch-icon.png 2>/dev/null && echo "      ✓ apple-touch-icon.png → dist/"

echo ""
echo "======================================================"
echo " ✅ Frontend actualizado!"
echo "======================================================"
echo ""
echo " Backup conservado en: $FRONTEND_BACKUP"
echo " (puedes borrarlo cuando confirmes que todo funciona)"
echo ""
