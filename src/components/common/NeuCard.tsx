import React, { ReactNode } from 'react';

interface NeuCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'flat' | 'raised' | 'inset';
  onClick?: () => void;
}

export const NeuCard: React.FC<NeuCardProps> = ({
  children,
  className = '',
  variant = 'flat',
  onClick,
}) => {
  const variantClass =
    variant === 'flat'
      ? 'neu-flat'
      : variant === 'raised'
      ? 'neu-raised'
      : 'neu-inset';

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-5 ${variantClass} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
