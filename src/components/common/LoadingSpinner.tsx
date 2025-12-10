import React from 'react';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-12 w-12',
        lg: 'h-16 w-16',
    };

    return (
        <div className="flex items-center justify-center">
            <div
                className={`animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClasses[size]}`}
            />
        </div>
    );
};
