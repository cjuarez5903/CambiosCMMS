import { MigrationInterface, QueryRunner } from 'typeorm';

export class CrearVistasITTickets1733880600000 implements MigrationInterface {
  name = 'CrearVistasITTickets1733880600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Vista 1: estadísticas por categoría y estado (usada en obtenerEstadisticas)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_it_tickets_por_categoria_estado AS
      SELECT categoria, estado, COUNT(*) AS cantidad
      FROM it_tickets
      GROUP BY categoria, estado
    `);

    // Vista 2: estadísticas por usuario/técnico (usada en obtenerEstadisticasPorTecnico)
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_it_tickets_por_usuario AS
      SELECT
        u.email            AS usuario_email,
        u.nombre           AS usuario_nombre,
        COUNT(DISTINCT t_creados.id)  AS tickets_creados,
        COUNT(DISTINCT t_asignados.id) AS tickets_asignados,
        COUNT(DISTINCT CASE WHEN t_asignados.estado IN ('abierto', 'en_progreso')
          THEN t_asignados.id END) AS tickets_abiertos_asignados,
        COUNT(DISTINCT CASE WHEN t_asignados.estado IN ('resuelto', 'cerrado')
          THEN t_asignados.id END) AS tickets_resueltos_asignados
      FROM usuarios u
      LEFT JOIN it_tickets t_creados    ON t_creados.creado_por  = u.id
      LEFT JOIN it_tickets t_asignados  ON t_asignados.asignado_a = u.email
      GROUP BY u.id, u.email, u.nombre
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS v_it_tickets_por_usuario`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_it_tickets_por_categoria_estado`);
  }
}
