import React from 'react';
import { cx } from '../../../utils/cx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', className }) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    rose: 'bg-red-500/10 text-red-400 border-red-500/20',
    slate: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border', variantStyles[variant], className)}>
      {children}
    </span>
  );
};
