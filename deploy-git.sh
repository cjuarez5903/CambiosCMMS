#!/bin/bash
# ============================================================
# DEPLOY VÍA GITHUB — MRB CMMS
# Repositorio de cambios: https://github.com/cjuarez5903/CambiosCMMS.git
#
# Primer uso — subir el script al servidor:
#   scp deploy-git.sh ubuntu@ip-172-31-31-177:~/deploy-git.sh
#
# Cada deploy posterior — solo ejecutar en el servidor:
#   bash ~/deploy-git.sh
# ============================================================

REPO_URL="https://github.com/cjuarez5903/CambiosCMMS.git"
CAMBIOS=~/CambiosCMMS
BACKEND=~/cmms-backend
BACKUP_DIR=~/cmms-backend-backup-$(date +%Y%m%d_%H%M%S)

echo "======================================================"
echo " MRB CMMS — Deploy desde GitHub"
echo " Repo: $REPO_URL"
echo "======================================================"

# ── BACKUP COMPLETO ───────────────────────────────────────
echo ""
echo "[1/6] Creando backup completo del proyecto..."
cp -r $BACKEND $BACKUP_DIR
if [ $? -ne 0 ]; then
  echo "      ✗ ERROR: No se pudo crear backup. Abortando."
  exit 1
fi
echo "      ✓ Backup en: $BACKUP_DIR"
echo ""
echo "      Si algo falla, restaura con:"
echo "        pm2 stop all"
echo "        rm -rf $BACKEND"
echo "        cp -r $BACKUP_DIR $BACKEND"
echo "        cd $BACKEND && npm run build && pm2 restart all"

# Función de rollback automático
rollback() {
  echo ""
  echo "======================================================"
  echo " ✗ ERROR DETECTADO — Iniciando rollback automático..."
  echo "======================================================"
  pm2 stop all 2>/dev/null
  rm -rf $BACKEND
  cp -r $BACKUP_DIR $BACKEND
  cd $BACKEND
  npm run build 2>/dev/null
  pm2 restart all 2>/dev/null
  echo " ✓ Proyecto restaurado al estado anterior."
  echo " Backup conservado en: $BACKUP_DIR"
  echo "======================================================"
  exit 1
}

# ── OBTENER ARCHIVOS DESDE GITHUB ────────────────────────
echo ""
echo "[2/6] Obteniendo archivos desde GitHub..."

if [ -d "$CAMBIOS/.git" ]; then
  echo "      → Actualizando repo existente..."
  cd $CAMBIOS
  git pull origin main || { echo "      ✗ Error en git pull"; rollback; }
else
  echo "      → Clonando repositorio..."
  rm -rf $CAMBIOS
  git clone $REPO_URL $CAMBIOS || { echo "      ✗ Error en git clone"; rollback; }
fi
echo "      ✓ Archivos actualizados desde GitHub"

# ── VERIFICAR Y CREAR CARPETAS ───────────────────────────
echo ""
echo "[3/6] Verificando estructura de carpetas..."

dirs=(
  "$BACKEND/src"
  "$BACKEND/src/entities"
  "$BACKEND/src/migrations"
  "$BACKEND/src/common/guards"
  "$BACKEND/src/modules/paises/dto"
  "$BACKEND/src/modules/ordenes-trabajo"
  "$BACKEND/src/modules/email"
  "$BACKEND/src/modules/it-tickets"
  "$BACKEND/src/modules/it-tickets/dto"
  "$BACKEND/src/modules/it-tickets/entities"
  "$BACKEND/src/modules/common/dto"
  "$BACKEND/src/modules/planta-tratamiento/dto"
)

for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "      + Creada: $dir"
  else
    echo "      ✓ OK: $dir"
  fi
done

# ── BACKUP + COPIA DE ARCHIVOS ───────────────────────────
echo ""
echo "[4/6] Copiando archivos al backend..."

copiar() {
  local src=$1
  local dst=$2
  if [ -f "$dst" ]; then
    cp "$dst" "${dst}.old" 2>/dev/null
  fi
  cp "$CAMBIOS/$src" "$dst"
  echo "      ✓ $src"
}

# IT tickets — entidad principal va a src/entities/ (canónica, evita duplicados con glob)
copiar it-ticket.entity.ts                                    $BACKEND/src/entities/it-ticket.entity.ts
# Eliminar duplicado en módulo si existe (causaba carga doble en TypeORM)
rm -f $BACKEND/src/modules/it-tickets/entities/it-ticket.entity.ts

# IT tickets — resto de archivos del módulo
copiar it-tickets.controller.ts                               $BACKEND/src/modules/it-tickets/it-tickets.controller.ts
copiar it-notifications.gateway.ts                            $BACKEND/src/modules/it-tickets/it-notifications.gateway.ts
copiar it-ticket-comentario.entity.ts                         $BACKEND/src/modules/it-tickets/entities/it-ticket-comentario.entity.ts
copiar it-ticket-historial.entity.ts                          $BACKEND/src/modules/it-tickets/entities/it-ticket-historial.entity.ts
copiar update-it-ticket.dto.ts                                $BACKEND/src/modules/it-tickets/dto/update-it-ticket.dto.ts
copiar pagination.dto.ts                                      $BACKEND/src/modules/common/dto/pagination.dto.ts

# Archivos modificados
copiar app.module.ts                                          $BACKEND/src/app.module.ts
copiar pais.entity.ts                                         $BACKEND/src/entities/pais.entity.ts
copiar sucursal.entity.ts                                     $BACKEND/src/entities/sucursal.entity.ts
copiar paises.service.ts                                      $BACKEND/src/modules/paises/paises.service.ts
copiar crear-pais.dto.ts                                      $BACKEND/src/modules/paises/dto/crear-pais.dto.ts
copiar ordenes-trabajo.service.ts                             $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.service.ts
copiar email.service.ts                                       $BACKEND/src/modules/email/email.service.ts
copiar it-tickets.service.ts                                  $BACKEND/src/modules/it-tickets/it-tickets.service.ts
copiar it-tickets.module.ts                                   $BACKEND/src/modules/it-tickets/it-tickets.module.ts
copiar create-it-ticket.dto.ts                                $BACKEND/src/modules/it-tickets/dto/create-it-ticket.dto.ts
copiar roles.guard.ts                                         $BACKEND/src/common/guards/roles.guard.ts
copiar package.json                                           $BACKEND/package.json

# Archivos nuevos (módulo planta)
copiar configuracion-planta.entity.ts                         $BACKEND/src/entities/configuracion-planta.entity.ts
copiar lectura-planta.entity.ts                               $BACKEND/src/entities/lectura-planta.entity.ts
copiar planta-tratamiento.module.ts                           $BACKEND/src/modules/planta-tratamiento/planta-tratamiento.module.ts
copiar planta-tratamiento.service.ts                          $BACKEND/src/modules/planta-tratamiento/planta-tratamiento.service.ts
copiar planta-tratamiento.controller.ts                       $BACKEND/src/modules/planta-tratamiento/planta-tratamiento.controller.ts
copiar crear-lectura.dto.ts                                   $BACKEND/src/modules/planta-tratamiento/dto/crear-lectura.dto.ts
copiar configurar-planta.dto.ts                               $BACKEND/src/modules/planta-tratamiento/dto/configurar-planta.dto.ts

# Migraciones
copiar 1733880000000-AgregarTasaCambioPais.ts                 $BACKEND/src/migrations/1733880000000-AgregarTasaCambioPais.ts
copiar 1733880100000-AgregarCostosMonedaLocal.ts               $BACKEND/src/migrations/1733880100000-AgregarCostosMonedaLocal.ts
copiar 1733880200000-AgregarSolicitadoPor.ts                   $BACKEND/src/migrations/1733880200000-AgregarSolicitadoPor.ts
copiar 1733880400000-AgregarGerentePaisYPlantaTratamiento.ts   $BACKEND/src/migrations/1733880400000-AgregarGerentePaisYPlantaTratamiento.ts
copiar 1733880500000-CorregirFormatoPermisosIT.ts               $BACKEND/src/migrations/1733880500000-CorregirFormatoPermisosIT.ts

# ── VARIABLES DE ENTORNO ─────────────────────────────────
echo ""
echo "[5/6] Verificando variables de entorno..."

add_env() {
  local key=$1 val=$2
  if grep -q "^${key}=" $BACKEND/.env 2>/dev/null; then
    echo "      ✓ $key ya existe"
  else
    echo "${key}=${val}" >> $BACKEND/.env
    echo "      + $key agregado"
  fi
}

add_env "FRANCISCO_EMAIL"      "fspross@mrbstorage.com"
add_env "PLANTA_ALERTA_EMAILS" "fspross@mrbstorage.com"

# ── BUILD + MIGRATE + RESTART ────────────────────────────
echo ""
echo "[6/6] Build, migraciones y reinicio..."

cd $BACKEND

echo "      → npm install..."
npm install || rollback

echo "      → Limpiando build anterior..."
rm -rf $BACKEND/dist

echo "      → npm run build..."
npm run build || rollback

echo "      → npm run migration:run..."
npm run migration:run || rollback

pm2 restart all
pm2 status

echo ""
echo "======================================================"
echo " ✅ Deploy completado!"
echo "======================================================"
echo ""
echo " Backup anterior conservado en: $BACKUP_DIR"
echo " (puedes borrarlo cuando confirmes que todo funciona)"
echo ""
