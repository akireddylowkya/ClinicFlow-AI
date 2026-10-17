import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'blue' | 'teal' | 'amber' | 'rose' | 'purple' | 'emerald';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType = 'neutral',
  color = 'blue',
  onClick,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-sky-50',
      icon: 'text-sky-600',
      border: 'hover:border-sky-300'
    },
    teal: {
      bg: 'bg-teal-50',
      icon: 'text-teal-600',
      border: 'hover:border-teal-300'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      border: 'hover:border-amber-300'
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      border: 'hover:border-rose-300'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'hover:border-purple-300'
    },
    emerald: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      border: 'hover:border-emerald-300'
    }
  };

  const trendStyles = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-rose-600 bg-rose-50',
    neutral: 'text-slate-600 bg-slate-50'
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md ' + colorMap[color].border : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${colorMap[color].bg} ${colorMap[color].icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
        {trend && (
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${trendStyles[trendType]}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500 line-clamp-1">{subtitle}</p>}
    </div>
  );
};
