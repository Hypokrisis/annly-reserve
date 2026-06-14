import React from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Props {
    error?: string | null;
    onRetry?: () => void;
}

/**
 * Full-screen gate shown by route guards while auth is resolving.
 * - No error  → spinner (still loading)
 * - Error     → message + "Reintentar" button
 *
 * Guarantees the user never sees a blank screen or an infinite spinner when
 * the network is slow/unreachable.
 */
export const AuthStatusScreen: React.FC<Props> = ({ error, onRetry }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
            {error ? (
                <div className="max-w-sm w-full text-center bg-space-card border border-space-border rounded-2xl p-8 shadow-xl">
                    <p className="text-sm font-medium text-space-muted mb-6">{error}</p>
                    {onRetry && (
                        <button onClick={onRetry} className="btn-primary w-full h-11">
                            Reintentar
                        </button>
                    )}
                </div>
            ) : (
                <LoadingSpinner />
            )}
        </div>
    );
};
