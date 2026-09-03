import React from 'react';

export interface DataReadoutProps {
    label: string;
    value: string | number;
    unit?: string;
    className?: string;
}

export const DataReadout: React.FC<DataReadoutProps> = ({ label, value, unit, className = '' }) => {
    return (
        <div className={`flex flex-col ${className}`}>
            <span className="text-xs uppercase tracking-wider text-text-secondary mb-1">{label}</span>
            <div className="font-mono text-accent">
                {value}
                {unit && <span className="text-text-secondary ml-1">{unit}</span>}
            </div>
        </div>
    );
};
