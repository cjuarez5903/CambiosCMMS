import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarSolicitadoPor1733880200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existeColumna = await queryRunner.hasColumn('ordenes_trabajo', 'solicitado_por');

    if (!existeColumna) {
      await queryRunner.query(`
        ALTER TABLE ordenes_trabajo
        ADD COLUMN solicitado_por INT NULL
      `);

      // Verificar si el FK ya existe antes de agregarlo
      const [fkRows] = await queryRunner.query(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'ordenes_trabajo'
          AND CONSTRAINT_NAME = 'FK_ordenes_trabajo_solicitado_por'
      `);

      if (!fkRows) {
        await queryRunner.query(`
          ALTER TABLE ordenes_trabajo
          ADD CONSTRAINT FK_ordenes_trabajo_solicitado_por
          FOREIGN KEY (solicitado_por) REFERENCES usuarios(id)
        `);
      }

      await queryRunner.query(`
        UPDATE ordenes_trabajo SET solicitado_por = creado_por WHERE solicitado_por IS NULL
      `);

      await queryRunner.query(`
        ALTER TABLE ordenes_trabajo MODIFY COLUMN solicitado_por INT NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existeColumna = await queryRunner.hasColumn('ordenes_trabajo', 'solicitado_por');
    if (existeColumna) {
      await queryRunner.query(`
        ALTER TABLE ordenes_trabajo DROP FOREIGN KEY FK_ordenes_trabajo_solicitado_por
      `);
      await queryRunner.query(`
        ALTER TABLE ordenes_trabajo DROP COLUMN solicitado_por
      `);
    }
  }
}
