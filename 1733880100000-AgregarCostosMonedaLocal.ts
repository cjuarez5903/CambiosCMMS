import { MigrationInterface, QueryRunner } from 'typeorm';

export class AgregarCostosMonedaLocal1733880100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const existeEstimado = await queryRunner.hasColumn('ordenes_trabajo', 'costo_estimado_local');
    const existeReal = await queryRunner.hasColumn('ordenes_trabajo', 'costo_real_local');

    const columnas: string[] = [];
    if (!existeEstimado) columnas.push('ADD COLUMN costo_estimado_local DECIMAL(10, 2) NULL');
    if (!existeReal) columnas.push('ADD COLUMN costo_real_local DECIMAL(10, 2) NULL');

    if (columnas.length > 0) {
      await queryRunner.query(`ALTER TABLE ordenes_trabajo ${columnas.join(', ')}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const existeEstimado = await queryRunner.hasColumn('ordenes_trabajo', 'costo_estimado_local');
    const existeReal = await queryRunner.hasColumn('ordenes_trabajo', 'costo_real_local');

    const columnas: string[] = [];
    if (existeEstimado) columnas.push('DROP COLUMN costo_estimado_local');
    if (existeReal) columnas.push('DROP COLUMN costo_real_local');

    if (columnas.length > 0) {
      await queryRunner.query(`ALTER TABLE ordenes_trabajo ${columnas.join(', ')}`);
    }
  }
}
