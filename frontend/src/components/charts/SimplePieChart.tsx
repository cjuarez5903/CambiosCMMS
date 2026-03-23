import React from 'react';

interface SimplePieChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  height?: number;
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({ data, height = 250 }) => {
  // Filtrar datos válidos
  const validData = data.filter(item => item.value > 0);

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="w-20 h-20 border-4 border-gray-200 rounded-full mx-auto mb-2"></div>
          <p className="text-xs">Sin datos</p>
        </div>
      </div>
    );
  }

  const total = validData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3" style={{ height: 'auto' }}>
      {/* Lista de elementos con colores */}
      {validData.map((item, index) => {
        const percentage = ((item.value / total) * 100).toFixed(1);
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
              <span className="text-xs text-gray-500">({percentage}%)</span>
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className="border-t pt-2 mt-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <span className="text-sm font-bold text-gray-900">{total}</span>
        </div>
      </div>
    </div>
  );
};

export default SimplePieChart;
