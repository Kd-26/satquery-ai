import React from 'react';

export interface TabsProps {
    tabs: string[];
    activeTab: string;
    onChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
    return (
        <div className="flex gap-2 border-b border-subtle mb-4">
            {tabs.map(tab => (
                <button
                    key={tab}
                    onClick={() => onChange(tab)}
                    className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                        activeTab === tab 
                            ? 'border-accent text-text-primary' 
                            : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
    );
};
