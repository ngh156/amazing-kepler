import React from 'react';
import { cx } from '../../../utils/cx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emerald' | 'destructive' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all rounded-lg focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: 'bg-yellow-400 hover:bg-yellow-500 text-black shadow-md shadow-yellow-500/10',
    secondary: 'bg-[#2b313a] hover:bg-[#363c4e] text-white border border-[#363c4e]',
    emerald: 'bg-[#0ecb81] hover:bg-[#0ba368] text-black shadow-md shadow-emerald-500/20',
    destructive: 'bg-[#f6465d] hover:bg-[#d93a4f] text-white shadow-md shadow-red-500/20',
    outline: 'border border-[#2b313a] hover:bg-[#2b313a]/50 text-gray-300 hover:text-white',
  };

  return (
    <button
      className={cx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <span className="animate-pulse">Loading...</span> : children}
    </button>
  );
};
