import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    label?: string;
    /** Emits the parsed numeric value on every change, not the raw DOM event. */
    onChange?: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({ label, className = '', onChange, ...props }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(parseFloat(e.target.value));
    };

    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {label && <label className="text-sm text-text-secondary">{label}</label>}
            <input
                type="range"
                className="accent-accent"
                onChange={handleChange}
                {...props}
            />
        </div>
    );
};
