#!/bin/bash
# ============================================================
# SCRIPT DE DEPLOY — MRB CMMS — Abril 2026
# Ejecutar desde el servidor Ubuntu:
#   bash ~/CambiosCMMS/deploy.sh
# ============================================================

CAMBIOS=~/CambiosCMMS
BACKEND=~/cmms-backend
BACKUP_DIR=~/cmms-backend-backup-$(date +%Y%m%d_%H%M%S)

echo "======================================================"
echo " MRB CMMS — Deploy Automático"
echo "======================================================"

# ── BACKUP COMPLETO DEL PROYECTO ──────────────────────────
echo ""
echo "[0/6] Creando backup completo del proyecto..."
cp -r $BACKEND $BACKUP_DIR
if [ $? -ne 0 ]; then
  echo "      ✗ ERROR: No se pudo crear el backup. Abortando."
  exit 1
fi
echo "      ✓ Backup guardado en: $BACKUP_DIR"
echo ""
echo "      Si algo falla, restaura con:"
echo "        pm2 stop all"
echo "        rm -rf $BACKEND"
echo "        cp -r $BACKUP_DIR $BACKEND"
echo "        cd $BACKEND && npm run build && pm2 restart all"
echo ""

# Función de rollback automático en caso de error crítico
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
  echo ""
  echo " ✓ Proyecto restaurado al estado anterior."
  echo " Backup conservado en: $BACKUP_DIR"
  echo "======================================================"
  exit 1
}

# ── VERIFICAR Y CREAR CARPETAS NECESARIAS ────────────────
echo ""
echo "[1/6] Verificando estructura de carpetas..."

dirs=(
  "$BACKEND/src"
  "$BACKEND/src/entities"
  "$BACKEND/src/migrations"
  "$BACKEND/src/common/guards"
  "$BACKEND/src/modules/paises/dto"
  "$BACKEND/src/modules/ordenes-trabajo"
  "$BACKEND/src/modules/email"
  "$BACKEND/src/modules/it-tickets"
  "$BACKEND/src/modules/it-tickets/entities"
  "$BACKEND/src/modules/planta-tratamiento/dto"
  "$BACKEND/src/modules/ordenes-trabajo/entities"
)

for dir in "${dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    mkdir -p "$dir"
    echo "      + Creada: $dir"
  else
    echo "      ✓ OK: $dir"
  fi
done

# ── BACKUP + COPIA DE ARCHIVOS MODIFICADOS ───────────────
echo ""
echo "[2/6] Haciendo backup y copiando archivos modificados..."

# app.module.ts
cp $BACKEND/src/app.module.ts $BACKEND/src/app.module.ts.old 2>/dev/null; echo "      ✓ app.module.ts.old"
cp $CAMBIOS/app.module.ts $BACKEND/src/

# pais.entity.ts
cp $BACKEND/src/entities/pais.entity.ts $BACKEND/src/entities/pais.entity.ts.old 2>/dev/null; echo "      ✓ pais.entity.ts.old"
cp $CAMBIOS/pais.entity.ts $BACKEND/src/entities/

# paises.service.ts
cp $BACKEND/src/modules/paises/paises.service.ts $BACKEND/src/modules/paises/paises.service.ts.old 2>/dev/null; echo "      ✓ paises.service.ts.old"
cp $CAMBIOS/paises.service.ts $BACKEND/src/modules/paises/

# crear-pais.dto.ts
cp $BACKEND/src/modules/paises/dto/crear-pais.dto.ts $BACKEND/src/modules/paises/dto/crear-pais.dto.ts.old 2>/dev/null; echo "      ✓ crear-pais.dto.ts.old"
cp $CAMBIOS/crear-pais.dto.ts $BACKEND/src/modules/paises/dto/

# ordenes-trabajo.service.ts
cp $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.service.ts $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.service.ts.old 2>/dev/null; echo "      ✓ ordenes-trabajo.service.ts.old"
cp $CAMBIOS/ordenes-trabajo.service.ts $BACKEND/src/modules/ordenes-trabajo/

# ordenes-trabajo.controller.ts
cp $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.controller.ts $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.controller.ts.old 2>/dev/null; echo "      ✓ ordenes-trabajo.controller.ts.old"
cp $CAMBIOS/ordenes-trabajo.controller.ts $BACKEND/src/modules/ordenes-trabajo/

# ordenes-trabajo.module.ts
cp $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.module.ts $BACKEND/src/modules/ordenes-trabajo/ordenes-trabajo.module.ts.old 2>/dev/null; echo "      ✓ ordenes-trabajo.module.ts.old"
cp $CAMBIOS/ordenes-trabajo.module.ts $BACKEND/src/modules/ordenes-trabajo/

# email.service.ts
cp $BACKEND/src/modules/email/email.service.ts $BACKEND/src/modules/email/email.service.ts.old 2>/dev/null; echo "      ✓ email.service.ts.old"
cp $CAMBIOS/email.service.ts $BACKEND/src/modules/email/

# it-tickets.service.ts
cp $BACKEND/src/modules/it-tickets/it-tickets.service.ts $BACKEND/src/modules/it-tickets/it-tickets.service.ts.old 2>/dev/null; echo "      ✓ it-tickets.service.ts.old"
cp $CAMBIOS/it-tickets.service.ts $BACKEND/src/modules/it-tickets/

# roles.guard.ts
cp $BACKEND/src/common/guards/roles.guard.ts $BACKEND/src/common/guards/roles.guard.ts.old 2>/dev/null; echo "      ✓ roles.guard.ts.old"
cp $CAMBIOS/roles.guard.ts $BACKEND/src/common/guards/

# package.json
cp $BACKEND/package.json $BACKEND/package.json.old 2>/dev/null; echo "      ✓ package.json.old"
cp $CAMBIOS/package.json $BACKEND/

# ── ARCHIVOS NUEVOS (sin backup) ─────────────────────────
echo ""
echo "[3/6] Copiando archivos nuevos..."

cp $CAMBIOS/it-ticket.entity.ts $BACKEND/src/modules/it-tickets/entities/; echo "      ✓ it-ticket.entity.ts"
cp $CAMBIOS/it-ticket-comentario.entity.ts $BACKEND/src/modules/it-tickets/entities/; echo "      ✓ it-ticket-comentario.entity.ts"
cp $CAMBIOS/it-ticket-historial.entity.ts $BACKEND/src/modules/it-tickets/entities/; echo "      ✓ it-ticket-historial.entity.ts"
cp $CAMBIOS/configuracion-planta.entity.ts $BACKEND/src/entities/; echo "      ✓ configuracion-planta.entity.ts"
cp $CAMBIOS/lectura-planta.entity.ts $BACKEND/src/entities/; echo "      ✓ lectura-planta.entity.ts"
cp $CAMBIOS/entities/orden-trabajo-comentario.entity.ts $BACKEND/src/entities/; echo "      ✓ orden-trabajo-comentario.entity.ts"
cp $CAMBIOS/planta-tratamiento.module.ts $BACKEND/src/modules/planta-tratamiento/; echo "      ✓ planta-tratamiento.module.ts"
cp $CAMBIOS/planta-tratamiento.service.ts $BACKEND/src/modules/planta-tratamiento/; echo "      ✓ planta-tratamiento.service.ts"
cp $CAMBIOS/planta-tratamiento.controller.ts $BACKEND/src/modules/planta-tratamiento/; echo "      ✓ planta-tratamiento.controller.ts"
cp $CAMBIOS/crear-lectura.dto.ts $BACKEND/src/modules/planta-tratamiento/dto/; echo "      ✓ crear-lectura.dto.ts"
cp $CAMBIOS/configurar-planta.dto.ts $BACKEND/src/modules/planta-tratamiento/dto/; echo "      ✓ configurar-planta.dto.ts"

# ── MIGRACIONES ──────────────────────────────────────────
echo ""
echo "[4/6] Copiando migraciones..."

# Modificadas (idempotentes)
cp $BACKEND/src/migrations/1733880000000-AgregarTasaCambioPais.ts $BACKEND/src/migrations/1733880000000-AgregarTasaCambioPais.ts.old 2>/dev/null
cp $CAMBIOS/1733880000000-AgregarTasaCambioPais.ts $BACKEND/src/migrations/; echo "      ✓ 1733880000000 (idempotente)"

cp $BACKEND/src/migrations/1733880100000-AgregarCostosMonedaLocal.ts $BACKEND/src/migrations/1733880100000-AgregarCostosMonedaLocal.ts.old 2>/dev/null
cp $CAMBIOS/1733880100000-AgregarCostosMonedaLocal.ts $BACKEND/src/migrations/; echo "      ✓ 1733880100000 (idempotente)"

cp $BACKEND/src/migrations/1733880200000-AgregarSolicitadoPor.ts $BACKEND/src/migrations/1733880200000-AgregarSolicitadoPor.ts.old 2>/dev/null
cp $CAMBIOS/1733880200000-AgregarSolicitadoPor.ts $BACKEND/src/migrations/; echo "      ✓ 1733880200000 (idempotente)"

# Nuevas
cp $CAMBIOS/1733880400000-AgregarGerentePaisYPlantaTratamiento.ts $BACKEND/src/migrations/; echo "      ✓ 1733880400000 (nueva)"
cp $CAMBIOS/1733880500000-CorregirFormatoPermisosIT.ts $BACKEND/src/migrations/; echo "      ✓ 1733880500000 (nueva)"

# ── VARIABLES DE ENTORNO ─────────────────────────────────
echo ""
echo "[5/6] Verificando variables de entorno..."

if grep -q "FRANCISCO_EMAIL" $BACKEND/.env 2>/dev/null; then
  echo "      ✓ FRANCISCO_EMAIL ya existe en .env"
else
  echo "" >> $BACKEND/.env
  echo "FRANCISCO_EMAIL=francisco@mrbstorage.com" >> $BACKEND/.env
  echo "      ✓ FRANCISCO_EMAIL agregado al .env"
fi

if grep -q "PLANTA_ALERTA_EMAILS" $BACKEND/.env 2>/dev/null; then
  echo "      ✓ PLANTA_ALERTA_EMAILS ya existe en .env"
else
  echo "PLANTA_ALERTA_EMAILS=juanjo@mrbstorage.com,correo2@mrbstorage.com" >> $BACKEND/.env
  echo "      ✓ PLANTA_ALERTA_EMAILS agregado al .env"
  echo "      ⚠ EDITA el .env y pon los correos correctos!"
fi

# FRONTEND_URL — actualizar a dominio real
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://cmms.mrbstorage.com|' $BACKEND/.env
echo "      ✓ FRONTEND_URL actualizado a https://cmms.mrbstorage.com"

# ── TABLA COMENTARIOS ÓRDENES DE TRABAJO ────────────────
echo ""
echo "[5b/6] Creando tabla orden_trabajo_comentarios si no existe..."

DB_HOST=$(grep DB_HOST $BACKEND/.env | cut -d= -f2)
DB_PORT=$(grep DB_PORT $BACKEND/.env | cut -d= -f2)
DB_USER=$(grep DB_USERNAME $BACKEND/.env | cut -d= -f2)
DB_PASS=$(grep DB_PASSWORD $BACKEND/.env | cut -d= -f2)
DB_NAME=$(grep DB_DATABASE $BACKEND/.env | cut -d= -f2)

mysql -h"$DB_HOST" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" <<'SQL'
CREATE TABLE IF NOT EXISTS orden_trabajo_comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orden_id INT NOT NULL,
  comentario TEXT NOT NULL,
  usuario_id INT NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (orden_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
SQL

if [ $? -eq 0 ]; then
  echo "      ✓ Tabla orden_trabajo_comentarios lista"
else
  echo "      ⚠ No se pudo crear la tabla (puede que ya exista o falta el cliente mysql)"
fi

# ── COMPILAR Y MIGRAR ─────────────────────────────────────
echo ""
echo "[6/6] Compilando y ejecutando migraciones..."

cd $BACKEND

echo "      → npm run build..."
npm run build || rollback

echo "      → npm run migration:run..."
npm run migration:run || rollback

echo ""
echo "======================================================"
echo " Reiniciando backend con PM2..."
echo "======================================================"
pm2 restart all
pm2 status

echo ""
echo "======================================================"
echo " ✅ Deploy completado!"
echo "======================================================"
echo ""
echo " Backup del proyecto anterior conservado en:"
echo " $BACKUP_DIR"
echo " (puedes borrarlo cuando confirmes que todo funciona)"
echo ""
echo " PENDIENTE MANUAL:"
echo " 1. Editar .env con correos reales:"
echo "    nano $BACKEND/.env"
echo " 2. Asignar Gerente de País Guatemala en BD"
echo " 3. Configurar Caudal de Diseño por sucursal"
echo ""
