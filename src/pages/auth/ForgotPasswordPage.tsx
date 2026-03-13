import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '@/services/auth.service';
import { isValidEmail } from '@/utils';
import { Scissors, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (!email) { setError('Por favor ingresa tu email'); return; }
        if (!isValidEmail(email)) { setError('Por favor ingresa un email válido'); return; }

        setLoading(true);
        try {
            await resetPassword(email);
            setSuccess(true);
        } catch {
            setError('Error al enviar el email. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-space-bg px-4">
            <div className="w-full max-w-md animate-fade-up">

                {/* Logo */}
                <div className="flex items-center gap-2.5 mb-8 justify-center">
                    <div className="w-9 h-9 bg-space-primary rounded-xl flex items-center justify-center shadow-btn">
                        <Scissors size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-space-text text-xl">Spacey</span>
                </div>

                <div className="card p-8 shadow-card-lg">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-space-primary-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Mail size={24} className="text-space-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-space-text">Recuperar Contraseña</h1>
                        <p className="text-space-muted text-sm mt-1">Te enviaremos un link para restablecerla</p>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="bg-green-50 border border-green-200 text-space-success px-4 py-3 rounded-xl text-sm mb-6">
                                ✅ Email enviado. Revisa tu bandeja de entrada.
                            </div>
                            <Link to="/login" className="btn-primary justify-center w-full">
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-space-danger px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label htmlFor="email" className="input-label">Tu Email</label>
                                <input
                                    type="email" id="email" value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    className="input-field" placeholder="tu@email.com"
                                    disabled={loading} autoComplete="email"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
                                {loading ? 'Enviando...' : 'Enviar Link de Recuperación'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-5 text-center">
                    <Link to="/login" className="text-sm text-space-muted hover:text-space-primary transition inline-flex items-center gap-1">
                        <ArrowLeft size={14} /> Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
