import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
    let baseStyles = "px-4 py-2 font-medium rounded-DEFAULT transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    
    let variantStyles = "";
    if (variant === 'primary') {
        variantStyles = "bg-accent text-primary hover:opacity-90";
    } else if (variant === 'secondary') {
        variantStyles = "bg-panel-raised border border-subtle text-text-primary hover:bg-subtle";
    } else if (variant === 'ghost') {
        variantStyles = "bg-transparent text-text-secondary hover:text-text-primary hover:bg-panel-raised";
    }
    
    return (
        <button className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
            {children}
        </button>
    );
};
