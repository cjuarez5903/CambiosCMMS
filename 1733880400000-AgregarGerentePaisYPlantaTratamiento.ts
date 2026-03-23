import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarGerentePaisYPlantaTratamiento1733880400000 implements MigrationInterface {
  name = 'AgregarGerentePaisYPlantaTratamiento1733880400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar gerente_pais_id a paises (si no existe)
    const existeGerente = await queryRunner.hasColumn('paises', 'gerente_pais_id');
    if (!existeGerente) {
      await queryRunner.query(`
        ALTER TABLE paises
        ADD COLUMN gerente_pais_id INT NULL,
        ADD CONSTRAINT fk_paises_gerente_pais
          FOREIGN KEY (gerente_pais_id) REFERENCES usuarios(id)
          ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    // 2. Crear tabla configuracion_planta_tratamiento (si no existe)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS configuracion_planta_tratamiento (
        id INT NOT NULL AUTO_INCREMENT,
        sucursal_id INT NOT NULL,
        caudal_diseno_m3_dia DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        notas TEXT NULL,
        creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_config_planta_sucursal (sucursal_id),
        CONSTRAINT fk_config_planta_sucursal
          FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Crear tabla lecturas_planta_tratamiento (si no existe)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS lecturas_planta_tratamiento (
        id INT NOT NULL AUTO_INCREMENT,
        sucursal_id INT NOT NULL,
        fecha_registro DATE NOT NULL,
        hora_registro DATETIME NOT NULL,
        lectura_actual_m3 DECIMAL(10,3) NOT NULL,
        lectura_anterior_m3 DECIMAL(10,3) NULL,
        consumo_diario_m3 DECIMAL(10,3) NULL,
        alerta_generada TINYINT NOT NULL DEFAULT 0,
        creado_por_id INT NOT NULL,
        creado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        KEY idx_lecturas_sucursal (sucursal_id),
        KEY idx_lecturas_fecha (fecha_registro),
        KEY idx_lecturas_hora (hora_registro),
        CONSTRAINT fk_lectura_sucursal
          FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_lectura_creado_por
          FOREIGN KEY (creado_por_id) REFERENCES usuarios(id)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS lecturas_planta_tratamiento`);
    await queryRunner.query(`DROP TABLE IF EXISTS configuracion_planta_tratamiento`);

    const existeGerente = await queryRunner.hasColumn('paises', 'gerente_pais_id');
    if (existeGerente) {
      await queryRunner.query(`
        ALTER TABLE paises
        DROP FOREIGN KEY fk_paises_gerente_pais,
        DROP COLUMN gerente_pais_id
      `);
    }
  }
}
