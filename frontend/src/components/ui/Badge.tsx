import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
    success: 'bg-success-100 text-success-800',
    warning: 'bg-warning-100 text-warning-800',
    error: 'bg-error-100 text-error-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
};

// Status Badge Component for campaign statuses
interface StatusBadgeProps {
  status: 'new' | 'in_progress' | 'completed' | 'cancelled' | 'pending' | 'approved' | 'rejected';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusConfig = {
    new: { variant: 'success' as BadgeVariant, label: 'New' },
    in_progress: { variant: 'warning' as BadgeVariant, label: 'In Progress' },
    completed: { variant: 'primary' as BadgeVariant, label: 'Completed' },
    cancelled: { variant: 'error' as BadgeVariant, label: 'Cancelled' },
    pending: { variant: 'warning' as BadgeVariant, label: 'Pending' },
    approved: { variant: 'success' as BadgeVariant, label: 'Approved' },
    rejected: { variant: 'error' as BadgeVariant, label: 'Rejected' },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

// Dot Badge Component for notifications
interface DotBadgeProps {
  count?: number;
  variant?: BadgeVariant;
  className?: string;
}

export const DotBadge: React.FC<DotBadgeProps> = ({
  count,
  variant = 'error',
  className = '',
}) => {
  if (!count || count === 0) return null;

  const variantClasses = {
    default: 'bg-gray-500',
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        h-5 w-5 text-xs font-medium text-white rounded-full
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};