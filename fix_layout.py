path = 'src/pages/dashboard/AIAssistantPage.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1) Add back button: inject right after the opening wrapper div
old_wrapper = '        <div className="space-y-10 pb-16 animate-fade-in">\n            \n            {/* ── HEADER CONTAINER'
new_wrapper = '''        <div className="space-y-10 pb-16 animate-fade-in px-2 sm:px-0">
            {/* Back button */}
            <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-space-card border border-space-border rounded-xl text-[10px] font-black text-space-muted hover:text-space-primary hover:border-space-primary/40 uppercase tracking-widest transition-all"
            >
                <ArrowRight size={14} className="rotate-180" /> Volver al Dashboard
            </button>

            {/* ── HEADER CONTAINER'''
c = c.replace(old_wrapper, new_wrapper, 1)

# 2) Fix config form card heading text-white
c = c.replace(
    'h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">\n                            ⚙️ Ajustes del Asistente de IA',
    'h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">\n                            ⚙️ Ajustes del Asistente de IA'
)

# 3) Fix prompt label text-white/60
c = c.replace(
    'label className="text-[9px] font-black text-white/60 uppercase tracking-wider">Instrucciones del Prompt',
    'label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Instrucciones del Prompt'
)

# 4) Fix preset heading text-white/40
c = c.replace(
    'className="text-[8px] font-black text-white/40 uppercase tracking-widest">Plantillas de Tono Rápidas:',
    'className="text-[8px] font-black text-space-muted uppercase tracking-widest">Plantillas de Tono Rápidas:'
)

# 5) Fix preset buttons bg-white/5 / border-white/10 / text-white
c = c.replace(
    'className="px-4 py-2 bg-white/5 hover:bg-space-primary/10 border border-white/10 hover:border-space-primary/30 rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 transition-all"',
    'className="px-4 py-2 bg-space-card2 hover:bg-space-primary/10 border border-space-border hover:border-space-primary/30 rounded-xl text-[9px] font-black text-space-text uppercase tracking-widest flex items-center gap-1.5 transition-all"'
)

# 6) Fix hr border-white/5
c = c.replace('className="border-white/5" />', 'className="border-space-border" />')

# 7) Fix booking/offer label text-white/60
c = c.replace(
    'label className="text-[9px] font-black text-white/60 uppercase tracking-wider">Enlace Oficial de Reservas',
    'label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Enlace Oficial de Reservas'
)
c = c.replace(
    'label className="text-[9px] font-black text-white/60 uppercase tracking-wider">Promoción/Oferta Activa',
    'label className="text-[9px] font-black text-space-muted uppercase tracking-wider">Promoción/Oferta Activa'
)

# 8) Fix time schedule panel bg-black/30 / border-white/5
c = c.replace(
    'grid grid-cols-2 gap-4 p-4 bg-black/30 rounded-2xl border border-white/5 animate-slide-down',
    'grid grid-cols-2 gap-4 p-4 bg-space-card2 rounded-2xl border border-space-border animate-slide-down'
)

# 9) Fix time label text-white/40
c = c.replace(
    'label className="text-[8px] font-black text-white/40 uppercase tracking-widest">Hora de Apertura Bot',
    'label className="text-[8px] font-black text-space-muted uppercase tracking-widest">Hora de Apertura Bot'
)
c = c.replace(
    'label className="text-[8px] font-black text-white/40 uppercase tracking-widest">Hora de Cierre Bot',
    'label className="text-[8px] font-black text-space-muted uppercase tracking-widest">Hora de Cierre Bot'
)

# 10) Fix logs card heading text-white
c = c.replace(
    'h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">\n                            💬 Bitácora de Conversaciones Recientes',
    'h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">\n                            💬 Bitácora de Conversaciones Recientes'
)

# 11) Fix logs refresh button bg-white/5
c = c.replace(
    'className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all border border-white/10"',
    'className="p-2 bg-space-card2 hover:bg-space-border rounded-xl text-space-muted hover:text-space-text transition-all border border-space-border"'
)

# 12) Fix log phone number text-white/80
c = c.replace(
    'className="text-[10px] font-black text-white/80 font-mono"',
    'className="text-[10px] font-black text-space-text font-mono"'
)

# 13) Fix log user message text-white/80
c = c.replace(
    'className="text-[11px] text-white/80 font-medium leading-relaxed mt-0.5">',
    'className="text-[11px] text-space-text font-medium leading-relaxed mt-0.5">'
)

# 14) Fix log bot response text-white/80 (same pattern)
# already covered by line above (AllowMultiple)

# 15) Fix QR subtitle text-white/40
c = c.replace(
    'className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5">Conecta tu número personal al bot asistente',
    'className="text-[9px] text-space-muted font-bold uppercase tracking-widest mt-0.5">Conecta tu número personal al bot asistente'
)

# 16) Fix QR disconnected "Sin Dispositivos" subtext text-white/40
c = c.replace(
    'className="text-[8px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">\n                                        Vincula tu celular en vivo para comenzar',
    'className="text-[8px] text-space-muted font-bold uppercase tracking-widest leading-relaxed">\n                                        Vincula tu celular en vivo para comenzar'
)

# 17) Fix QR connected device strong tag
c = c.replace(
    '<strong className="text-white">Samsung Galaxy S24 (WhatsApp Web)</strong>',
    '<strong className="text-space-text">Samsung Galaxy S24 (WhatsApp Web)</strong>'
)

# 18) Fix simulator card heading
c = c.replace(
    'h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">\n                                <Smartphone',
    'h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">\n                                <Smartphone'
)

# 19) Fix the onboarding section text-white heading (remaining)
c = c.replace(
    'h2 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">',
    'h2 className="text-base font-black text-space-text uppercase tracking-tight flex items-center gap-2">'
)

# 20) Also verify: make sure ArrowRight is imported (it's already imported)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print('Layout + color fix done')
print(f'File size: {len(c)} bytes')
