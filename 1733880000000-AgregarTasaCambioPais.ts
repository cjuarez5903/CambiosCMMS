import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarTasaCambioPais1733880000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existe = await queryRunner.hasColumn('paises', 'tasa_cambio_usd');
    if (!existe) {
      await queryRunner.query(`
        ALTER TABLE paises
        ADD COLUMN tasa_cambio_usd DECIMAL(10, 4) DEFAULT 1.0000 NOT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existe = await queryRunner.hasColumn('paises', 'tasa_cambio_usd');
    if (existe) {
      await queryRunner.query(`ALTER TABLE paises DROP COLUMN tasa_cambio_usd`);
    }
  }
}
