import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { isValidEmail } from '@/utils';
import { Scissors, Eye, EyeOff, ArrowRight, Zap, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const from = location.state?.from?.pathname || '/dashboard';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Por favor completa todos los campos.');
            return;
        }
        if (!isValidEmail(formData.email)) {
            setError('Por favor ingresa un email válido.');
            return;
        }

        setLoading(true);
        try {
            await login(formData.email, formData.password);
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f8faf9] relative overflow-hidden font-sans">
            {/* ── Background Elements ───────────────────────── */}
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-space-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-space-purple/10 rounded-full blur-[120px] pointer-events-none" />
            
            {/* ── Left: Branding & Value Props ────────────────── */}
            <div className="hidden lg:flex lg:w-[45%] bg-space-text flex-col justify-between p-16 relative overflow-hidden">
                {/* Dynamic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-space-primary/20 via-transparent to-space-purple/20 pointer-events-none" />
                
                {/* Visual Patterns */}
                <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

                {/* Top logo */}
                <div className="relative flex items-center gap-3 animate-fade-in">
                    <div className="w-12 h-12 bg-gradient-to-br from-space-primary to-space-primary-dark rounded-2xl flex items-center justify-center shadow-lg shadow-space-primary/20">
                        <Scissors size={24} className="text-white" />
                    </div>
                    <span className="text-white font-black text-2xl tracking-tighter uppercase italic">Spacey</span>
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-md">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 mb-8 animate-fade-in delay-100">
                        <Sparkles size={14} className="text-space-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Plataforma de Reservas Next-Gen</span>
                    </div>
                    
                    <h2 className="text-5xl font-black text-white leading-[1.1] mb-8 tracking-tighter uppercase italic animate-fade-in delay-200">
                        Eleva tu Negocio al <span className="text-space-primary">Máximo Nivel</span>
                    </h2>
                    
                    <div className="space-y-8 animate-fade-in delay-300">
                        {[
                            { icon: Zap, title: 'Reservas 24/7', desc: 'No pierdas ni una cita más. Automatización total.', color: 'text-amber-400' },
                            { icon: MessageSquare, title: 'WhatsApp Automático', desc: 'Confirmaciones y recordatorios por WhatsApp.', color: 'text-emerald-400' },
                            { icon: ShieldCheck, title: 'Control Total', desc: 'Gestiona tu equipo, servicios y finanzas.', color: 'text-sky-400' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-5 group">
                                <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-all duration-300 shadow-xl ${item.color}`}>
                                    <item.icon size={22} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                                    <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom footer */}
                <div className="relative z-10 flex items-center justify-between animate-fade-in delay-500">
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">© 2026 Spacey · Reservas Brutales</p>
                    <div className="flex gap-4">
                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                        <div className="w-1 h-1 rounded-full bg-white/20"></div>
                    </div>
                </div>
            </div>

            {/* ── Right: Login Form ──────────────────────────── */}
            <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50 relative">
                <div className="w-full max-w-sm relative z-10">
                    
                    {/* Brand for Mobile */}
                    <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
                        <div className="w-10 h-10 bg-space-primary rounded-xl flex items-center justify-center shadow-xl shadow-space-primary/20">
                            <Scissors size={20} className="text-white" />
                        </div>
                        <span className="font-black text-space-text text-2xl tracking-tighter uppercase italic">Spacey</span>
                    </div>

                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-space-text mb-2 tracking-tight uppercase italic">Bienvenido</h1>
                        <p className="text-space-muted text-xs font-bold uppercase tracking-widest">Inicia sesión en tu panel de control</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-10 border border-neutral-100">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-space-danger px-4 py-3 rounded-2xl text-[11px] font-bold uppercase text-center flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-space-danger"></span>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em] ml-2">Email Empresarial</label>
                                <input
                                    type="email" id="email" name="email"
                                    value={formData.email} onChange={handleChange}
                                    className="w-full px-6 py-4 bg-neutral-50 border-transparent rounded-[1.25rem] text-sm font-bold text-space-text focus:bg-white focus:ring-2 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300" 
                                    placeholder="nombre@empresa.com"
                                    disabled={loading} autoComplete="email"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between px-2">
                                    <label htmlFor="password" className="text-[10px] font-black text-space-muted uppercase tracking-[0.2em]">Contraseña</label>
                                    <Link to="/forgot-password" title="password line" className="text-[9px] text-space-primary font-black uppercase tracking-widest hover:underline transition">
                                        ¿Olvidaste?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        id="password" name="password"
                                        value={formData.password} onChange={handleChange}
                                        className="w-full px-6 py-4 bg-neutral-50 border-transparent rounded-[1.25rem] text-sm font-bold text-space-text focus:bg-white focus:ring-2 focus:ring-space-primary/10 focus:border-space-primary transition-all outline-none placeholder-neutral-300"
                                        placeholder="••••••••"
                                        disabled={loading} autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(!showPwd)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-neutral-300 hover:text-space-primary transition-colors"
                                    >
                                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full bg-space-text hover:bg-space-primary text-white h-16 rounded-[1.25rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                    </svg>
                                ) : (
                                    <>Aceder al Dashboard <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-8 border-t border-neutral-50 text-center">
                            <p className="text-[10px] font-bold text-space-muted uppercase tracking-widest">
                                ¿Nuevo en Spacey?{' '}
                                <Link to="/signup" className="text-space-primary hover:text-space-primary-dark font-black transition underline decoration-2 underline-offset-4">
                                    Crea tu cuenta gratis
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-space-muted font-black rounded-full hover:text-space-primary transition-all uppercase tracking-widest text-[9px] border border-neutral-100 hover:border-space-primary/10 hover:shadow-lg">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
