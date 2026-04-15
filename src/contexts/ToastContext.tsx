import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    toast: {
        success: (msg: string, duration?: number) => void;
        error: (msg: string, duration?: number) => void;
        warning: (msg: string, duration?: number) => void;
        info: (msg: string, duration?: number) => void;
    };
}

// ── Context ──────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ── Toast Item Component ─────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const config = {
        success: {
            icon: CheckCircle,
            bg: 'bg-white border-l-4 border-l-emerald-500',
            iconColor: 'text-emerald-500',
            title: '¡Listo!',
        },
        error: {
            icon: XCircle,
            bg: 'bg-white border-l-4 border-l-red-500',
            iconColor: 'text-red-500',
            title: 'Error',
        },
        warning: {
            icon: AlertTriangle,
            bg: 'bg-white border-l-4 border-l-amber-500',
            iconColor: 'text-amber-500',
            title: 'Atención',
        },
        info: {
            icon: Info,
            bg: 'bg-white border-l-4 border-l-blue-500',
            iconColor: 'text-blue-500',
            title: 'Info',
        },
    };

    const c = config[toast.type];
    const Icon = c.icon;

    return (
        <div
            className={`${c.bg} rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 flex items-start gap-3 min-w-[300px] max-w-[380px] animate-slide-in-right border border-space-border`}
            role="alert"
        >
            <Icon size={20} className={`${c.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-space-muted uppercase tracking-widest mb-0.5">{c.title}</p>
                <p className="text-sm font-semibold text-space-text leading-snug">{toast.message}</p>
            </div>
            <button
                onClick={() => onRemove(toast.id)}
                className="p-1 rounded-lg text-space-muted hover:text-space-text hover:bg-space-bg transition flex-shrink-0"
                aria-label="Cerrar"
            >
                <X size={14} />
            </button>
        </div>
    );
};

// ── Provider ─────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    const remove = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
        if (timerRef.current[id]) {
            clearTimeout(timerRef.current[id]);
            delete timerRef.current[id];
        }
    }, []);

    const add = useCallback((type: ToastType, message: string, duration = 4000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]); // max 5 toasts
        timerRef.current[id] = setTimeout(() => remove(id), duration);
    }, [remove]);

    const toast = {
        success: (msg: string, d?: number) => add('success', msg, d),
        error:   (msg: string, d?: number) => add('error',   msg, d),
        warning: (msg: string, d?: number) => add('warning', msg, d),
        info:    (msg: string, d?: number) => add('info',    msg, d),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            {/* Toast Container */}
            <div
                className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
                aria-live="polite"
                aria-label="Notificaciones"
            >
                {toasts.map(t => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onRemove={remove} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

// ── Hook ─────────────────────────────────────────────────────
export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within a ToastProvider');
    return ctx.toast;
};
