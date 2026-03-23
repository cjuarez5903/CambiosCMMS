import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, children, className = '', subtitle, icon }) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-slate-100 p-6 hover:shadow-xl transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400">Live</span>
        </div>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-lg pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ChartCard;
