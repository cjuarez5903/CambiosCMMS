import React from 'react';

interface SimpleBarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  horizontal?: boolean;
  height?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, horizontal = false, height = 300 }) => {
  const validData = data.filter(item => item.value > 0);
  const maxValue = Math.max(...validData.map(item => item.value));

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-500">
          <div className="w-20 h-20 border-4 border-gray-200 rounded mx-auto mb-2"></div>
          <p className="text-xs">Sin datos</p>
        </div>
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className="space-y-3" style={{ height: 'auto' }}>
        {validData.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          const color = item.color || '#3b82f6';

          return (
            <div key={index} className="flex items-center gap-3 group">
              <div className="w-16 text-xs font-medium text-gray-700 truncate" title={item.name}>
                {item.name.split('@')[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="w-12 text-xs font-bold text-gray-900 text-right">
                    {item.value}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 justify-center" style={{ height }}>
      {validData.map((item, index) => {
        const percentage = (item.value / maxValue) * 100;
        const color = item.color || '#3b82f6';

        return (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="text-xs font-bold text-gray-900">{item.value}%</div>
            <div
              className="w-12 bg-gray-200 rounded-t transition-all duration-1000 ease-out relative group cursor-pointer"
              style={{ height: '200px' }}
              title={`${item.name}: ${item.value}%`}
            >
              <div
                className="absolute bottom-0 w-full rounded-t transition-all duration-1000 ease-out group-hover:opacity-80"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="text-xs text-gray-600 text-center max-w-16 truncate" title={item.name}>
              {item.name.split('@')[0]}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleBarChart;
