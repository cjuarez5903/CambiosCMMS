import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'orange' | 'teal' | 'lightblue';
  trend?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend, actionLabel, onAction }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-mrb-blue',
    orange: 'bg-orange-50 text-mrb-orange',
    teal: 'bg-teal-50 text-mrb-teal',
    lightblue: 'bg-sky-50 text-mrb-lightblue',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
          {trend && <p className="text-xs text-green-600 mt-2 font-medium">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 w-full text-sm font-medium text-mrb-blue border border-mrb-blue rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default StatCard;
