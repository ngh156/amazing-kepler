import React from 'react';
import { cx } from '../../../utils/cx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, leftIcon, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-2.5 text-gray-500">{leftIcon}</div>}
        <input
          className={cx(
            'w-full bg-[#14181d] border border-[#2b313a] rounded-lg py-2 text-sm text-white focus:outline-none focus:border-yellow-400 transition-colors font-mono',
            leftIcon ? 'pl-9 pr-4' : 'px-3',
            error ? 'border-red-500' : '',
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-[11px] text-red-400 mt-1 block">{error}</span>}
    </div>
  );
};
