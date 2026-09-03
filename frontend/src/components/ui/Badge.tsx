import React from 'react';

export interface BadgeProps {
    variant?: 'success' | 'warning' | 'danger' | 'default';
    children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
    let styles = "bg-panel-raised text-text-secondary border-subtle";
    
    if (variant === 'success') {
        styles = "bg-success/10 text-success border-success/20";
    } else if (variant === 'warning') {
        styles = "bg-warning/10 text-warning border-warning/20";
    } else if (variant === 'danger') {
        styles = "bg-danger/10 text-danger border-danger/20";
    }
    
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border ${styles}`}>
            {children}
        </span>
    );
};
