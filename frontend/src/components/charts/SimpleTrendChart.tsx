import React from 'react';

interface SimpleTrendChartProps {
  data: Array<{ name: string; value: number; color?: string; total?: number; resueltos?: number }>;
  height?: number;
}

const SimpleTrendChart: React.FC<SimpleTrendChartProps> = ({ data, height = 300 }) => {
  const validData = data.filter(item => item.value > 0);

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="w-20 h-20 border-4 border-gray-200 rounded mx-auto mb-2"></div>
          <p className="text-xs">Sin datos de tendencias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ height: 'auto' }}>
      {/* Lista de técnicos con métricas detalladas */}
      {validData.map((item, index) => {
        const color = item.color || '#3b82f6';
        const percentage = Math.round(item.value);
        const total = item.total || 0;
        const resueltos = item.resueltos || 0;

        return (
          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium text-gray-800">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{percentage}%</div>
                <div className="text-xs text-gray-500">tasa resolución</div>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 min-w-12">{percentage}%</span>
              </div>
            </div>

            {/* Estadísticas detalladas */}
            <div className="flex justify-between text-xs text-gray-600">
              <span>Resueltos: {resueltos}</span>
              <span>Total: {total}</span>
              <span className={`font-medium ${
                percentage >= 80 ? 'text-green-600' :
                percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {percentage >= 80 ? 'Excelente' :
                 percentage >= 60 ? 'Regular' : 'Requiere atención'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleTrendChart;
