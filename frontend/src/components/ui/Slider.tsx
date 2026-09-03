import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
}

export const Slider: React.FC<SliderProps> = ({ label, className = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-sm text-text-secondary">{label}</label>}
            <input 
                type="range" 
                className="accent-accent"
                {...props} 
            />
        </div>
    );
};
