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

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop with Luxury Blur */}
            <div
                className="fixed inset-0 bg-space-bg/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className={`relative bg-space-card border border-space-gold/20 rounded-[2rem] shadow-2xl ${sizeClasses[size]} w-full overflow-hidden`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Luxury Header */}
                    <div className="flex items-center justify-between p-6 border-b border-space-border/50 bg-gradient-to-r from-space-card2 to-space-card">
                        <h2 className="text-2xl font-bold text-white font-serif">{title}</h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-space-muted hover:text-white hover:bg-space-card2 transition-all border border-transparent hover:border-space-gold/20"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content with subtle texture */}
                    <div className="p-6 relative">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d4af37 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        <div className="relative z-10 text-space-text">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
