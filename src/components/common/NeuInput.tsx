import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface NeuInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  helperText?: string;
}

export const NeuInput = forwardRef<HTMLInputElement, NeuInputProps>(
  ({ label, icon, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.replace(/\s+/g, '-').toLowerCase() : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-slate-600 mb-1.5 px-1">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`neu-input w-full rounded-xl py-2.5 text-sm text-slate-800 placeholder:text-slate-400 font-medium ${
              icon ? 'ps-10 pe-4' : 'px-4'
            } ${error ? 'border-rose-400 focus:border-rose-500' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-500 font-medium px-1">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400 px-1">{helperText}</p>
        )}
      </div>
    );
  }
);

NeuInput.displayName = 'NeuInput';

