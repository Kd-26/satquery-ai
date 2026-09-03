import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`bg-panel border border-subtle rounded-DEFAULT p-4 ${className}`} {...props}>
            {children}
        </div>
    );
};
