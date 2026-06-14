import React from 'react';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * App-wide error boundary.
 *
 * Without this, any uncaught render-time error (including a JS API that a given
 * browser doesn't support — a real risk on older WebKit/Android) unmounts the
 * whole React tree and leaves the user staring at a blank white page. This
 * catches it and shows a recoverable "something went wrong, reload" screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught render error:', error, info);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center px-4 bg-space-bg text-space-text">
                    <div className="max-w-md w-full text-center bg-space-card border border-space-border rounded-2xl p-8 shadow-xl">
                        <h1 className="text-xl font-extrabold tracking-tight mb-2">Algo salió mal</h1>
                        <p className="text-sm font-medium text-space-muted mb-6">
                            Ocurrió un error al cargar la aplicación. Por favor, recarga la página.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="btn-primary w-full h-11"
                        >
                            Recargar
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
