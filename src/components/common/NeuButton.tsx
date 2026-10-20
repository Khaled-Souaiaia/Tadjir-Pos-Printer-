import React, { ReactNode, ButtonHTMLAttributes } from 'react';

interface NeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'emerald' | 'default' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const NeuButton: React.FC<NeuButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  let variantStyles = '';
  switch (variant) {
    case 'primary':
      variantStyles = 'neu-button-primary font-semibold';
      break;
    case 'emerald':
      variantStyles = 'neu-button-emerald font-semibold';
      break;
    case 'danger':
      variantStyles =
        'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[4px_4px_12px_rgba(225,29,72,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] hover:from-rose-600 hover:to-red-700 active:translate-y-0.5 border border-white/20';
      break;
    case 'default':
    default:
      variantStyles = 'neu-raised text-slate-700 hover:text-slate-900 font-medium';
      break;
  }

  let sizeStyles = '';
  switch (size) {
    case 'sm':
      sizeStyles = 'py-1.5 px-3 text-xs gap-1.5';
      break;
    case 'lg':
      sizeStyles = 'py-3.5 px-6 text-base gap-2.5';
      break;
    case 'md':
    default:
      sizeStyles = 'py-2.5 px-4 text-sm gap-2';
      break;
  }

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-150 select-none whitespace-nowrap cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${variantStyles} ${sizeStyles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
