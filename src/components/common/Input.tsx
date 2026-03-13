import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    helperText,
    className = '',
    ...props
}) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-space-text mb-2">
                    {label}
                    {props.required && <span className="text-space-danger ml-1">*</span>}
                </label>
            )}
            <input
                className={`w-full px-4 py-2 min-h-[44px] bg-white text-space-text outline-none border ${error ? 'border-space-danger' : 'border-space-border'
                    } rounded-xl focus:ring-2 focus:ring-space-primary focus:border-transparent transition ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-space-danger">{error}</p>
            )}
            {helperText && !error && (
                <p className="mt-1 text-sm text-space-muted">{helperText}</p>
            )}
        </div>
    );
};
