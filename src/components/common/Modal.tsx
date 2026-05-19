import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses: Record<string, string> = {
        sm: 'sm:max-w-md',
        md: 'sm:max-w-lg',
        lg: 'sm:max-w-2xl',
        xl: 'sm:max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-space-bg/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal: bottom-sheet on mobile, centered dialog on sm+ */}
            <div
                className={`relative bg-space-card border border-space-border shadow-2xl w-full rounded-t-3xl sm:rounded-[2rem] ${sizeClasses[size]} mt-auto sm:mt-0 max-h-[90dvh] flex flex-col overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drag handle — mobile only */}
                <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-space-border rounded-full z-10" />

                {/* Sticky Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 border-b border-space-border bg-space-card sticky top-0 z-50 flex-shrink-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-space-text font-sans">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-space-muted hover:text-white hover:bg-space-danger transition-all border border-space-border group"
                    >
                        <X size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>

                {/* Scrollable content area */}
                <div className="p-5 sm:p-8 relative bg-space-card overflow-y-auto overscroll-contain flex-1">
                    <div className="relative z-10 text-space-text">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
