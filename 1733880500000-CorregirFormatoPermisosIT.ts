import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migración segura: lee el estado actual de permisos por rol y solo agrega
 * lo que falta (it_dashboard en rutas, it_tickets object). No sobreescribe
 * datos existentes si el formato ya es correcto.
 *
 * Casos manejados:
 *  A) permisos es un OBJETO JSON válido → agrega it_dashboard/it_tickets solo si faltan
 *  B) permisos es un ARRAY mixto (roto por AgregarPermisosIT) → reconstruye el objeto
 *     conservando las rutas originales más las IT
 *  C) permisos es null → no toca ese rol (no debería pasar)
 */

interface RolRow {
  id: number;
  nombre: string;
  permisos: string | null;
}

// Permisos IT que debe tener cada rol (según su nombre)
const IT_TICKETS_FULL = { ver: true, crear: true, historial: true, comentarios: true };
const IT_TICKETS_READONLY = { ver: true, historial: true, comentarios: true };

function getItTicketsForRol(nombre: string): Record<string, boolean> | null {
  if (nombre === 'Proveedor Externo') return null; // sin it_tickets
  if (nombre === 'Técnico Interno') return IT_TICKETS_READONLY;
  return IT_TICKETS_FULL;
}

// Rutas base por rol (sin IT) — para reconstruir si está roto
const RUTAS_BASE: Record<string, string[]> = {
  'Administrador':           ['dashboard','ordenes_trabajo','usuarios','paises','sucursales','proveedores','activos','reportes','it_soluciones','it_dashboard'],
  'Gerente Regional':        ['dashboard','sucursales','ordenes_trabajo','activos','proveedores','reportes','it_soluciones','it_dashboard'],
  'Administrador de Sucursal': ['dashboard','ordenes_trabajo','it_soluciones','it_dashboard'],
  'Técnico Interno':         ['dashboard','ordenes_trabajo','it_soluciones','it_dashboard'],
  'Proveedor Externo':       ['ordenes_trabajo','it_dashboard','it_soluciones'],
  'Gerente de País':         ['dashboard','ordenes_trabajo','reportes','it_soluciones','it_dashboard'],
};

export class CorregirFormatoPermisosIT1733880500000 implements MigrationInterface {
  name = 'CorregirFormatoPermisosIT1733880500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Leer roles del 1 al 6 (los que pueden estar afectados)
    const rows: RolRow[] = await queryRunner.query(
      `SELECT id, nombre, permisos FROM roles WHERE id BETWEEN 1 AND 6 ORDER BY id`,
    );

    for (const row of rows) {
      if (!row.permisos) continue;

      let parsed: any;
      try {
        parsed = JSON.parse(row.permisos);
      } catch {
        console.warn(`[Migration] Rol ${row.id} (${row.nombre}): permisos no es JSON válido, se omite.`);
        continue;
      }

      let fixed: any;

      if (Array.isArray(parsed)) {
        // CASO B: está roto (array mixto) — reconstruir desde rutas base
        console.log(`[Migration] Rol ${row.id} (${row.nombre}): permisos roto (array), reconstruyendo...`);
        const rutasBase = RUTAS_BASE[row.nombre] ?? ['dashboard'];
        fixed = { rutas: rutasBase };
        if (row.nombre === 'Administrador') {
          fixed.todo = true;
        }
        if (row.nombre === 'Proveedor Externo') {
          fixed.ordenes_trabajo = 'asignadas_proveedor';
        }
        const itTickets = getItTicketsForRol(row.nombre);
        if (itTickets) fixed.it_tickets = itTickets;

      } else if (typeof parsed === 'object') {
        // CASO A: objeto válido — solo agregar lo que falte
        fixed = { ...parsed };
        let changed = false;

        // Asegurar que 'rutas' sea array
        if (!Array.isArray(fixed.rutas)) {
          fixed.rutas = RUTAS_BASE[row.nombre] ?? [];
          changed = true;
        }

        // Agregar it_dashboard si falta
        if (!fixed.rutas.includes('it_dashboard')) {
          fixed.rutas.push('it_dashboard');
          changed = true;
        }

        // Agregar it_soluciones si falta
        if (!fixed.rutas.includes('it_soluciones')) {
          fixed.rutas.push('it_soluciones');
          changed = true;
        }

        // Agregar it_tickets si falta
        const itTickets = getItTicketsForRol(row.nombre);
        if (itTickets && !fixed.it_tickets) {
          fixed.it_tickets = itTickets;
          changed = true;
        }

        if (!changed) {
          console.log(`[Migration] Rol ${row.id} (${row.nombre}): permisos ya correctos, sin cambios.`);
          continue;
        }
        console.log(`[Migration] Rol ${row.id} (${row.nombre}): permisos actualizados (solo se agregó lo faltante).`);
      } else {
        console.warn(`[Migration] Rol ${row.id} (${row.nombre}): permisos en formato inesperado, se omite.`);
        continue;
      }

      await queryRunner.query(
        `UPDATE roles SET permisos = ? WHERE id = ? AND nombre = ?`,
        [JSON.stringify(fixed), row.id, row.nombre],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // El down no puede restaurar el estado previo sin un backup real.
    // Esta migración es segura: solo agrega campos, no borra datos existentes.
    console.log('[Migration DOWN] CorregirFormatoPermisosIT: no hay reversión automática segura.');
  }
}
