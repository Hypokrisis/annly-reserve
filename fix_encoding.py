import sys

path = 'src/pages/dashboard/AIAssistantPage.tsx'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

original_len = len(c)

# Fix mojibake (UTF-8 bytes decoded as Latin-1/Windows-1252)
mojibake = [
    # Emojis
    ('\u00f0\u009f\u00a4\u0096', '\U0001f916'),  # robot face 🤖
    ('\u00f0\u009f\u0094\u0087', '\U0001f507'),  # muted 🔇
    ('\u00f0\u009f\u008e\u0093', '\U0001f393'),  # graduation 🎓
    ('\u00f0\u009f\u0093\u0085', '\U0001f4c5'),  # calendar 📅
    ('\u00f0\u009f\u0094\u0097', '\U0001f517'),  # link 🔗
    ('\u00f0\u009f\u0094\u008c', '\U0001f50c'),  # plug 🔌
    ('\u00f0\u009f\u0092\u00ac', '\U0001f4ac'),  # speech bubble 💬
    ('\u00f0\u009f\u0093\u00b1', '\U0001f4f1'),  # mobile 📱
    ('\u00f0\u009f\u0094\u008d', '\U0001f50d'),  # magnifying glass 🔍
    ('\u00f0\u009f\u009a\u0080', '\U0001f680'),  # rocket 🚀
    ('\u00f0\u009f\u0092\u00b8', '\U0001f4b8'),  # money 💸
    ('\u00f0\u009f\u0092\u00b0', '\U0001f4b0'),  # money bag 💰
    ('\u00e2\u009c\u0082', '\u2702'),             # scissors ✂
    ('\u00e2\u009a\u00a1', '\u26a1'),             # lightning ⚡
    ('\u00e2\u0097\u0086', '\u25c6'),             # diamond ◆
    ('\u00e2\u0096\u00ba', '\u25ba'),             # triangle ▶
    ('\u00e2\u0094\u0080', '\u2500'),             # box drawing ─
    # Smart quotes & dashes
    ('\u00e2\u0080\u0094', '\u2014'),             # em dash —
    ('\u00e2\u0080\u0099', '\u2019'),             # right single quote '
    ('\u00e2\u0080\u009c', '\u201c'),             # left double quote "
    ('\u00e2\u0080\u009d', '\u201d'),             # right double quote "
    ('\u00e2\u0080\u00a2', '\u2022'),             # bullet •
    ('\u00e2\u0080\u00a6', '\u2026'),             # ellipsis …
    # Accented chars
    ('\u00c3\u00a9', '\u00e9'),  # é
    ('\u00c3\u00b3', '\u00f3'),  # ó
    ('\u00c3\u00a1', '\u00e1'),  # á
    ('\u00c3\u00ad', '\u00ed'),  # í
    ('\u00c3\u00ba', '\u00fa'),  # ú
    ('\u00c3\u00b1', '\u00f1'),  # ñ
    ('\u00c3\u00bc', '\u00fc'),  # ü
    ('\u00c3\u0093', '\u00d3'),  # Ó
    ('\u00c3\u0081', '\u00c1'),  # Á
    ('\u00c2\u00a1', '\u00a1'),  # ¡
    ('\u00c2\u00bf', '\u00bf'),  # ¿
    ('\u00c2\u00a9', '\u00a9'),  # ©
    ('\u00c2\u00b7', '\u00b7'),  # ·
    ('\u00c3\u00ba', '\u00fa'),  # ú
]

for bad, good in mojibake:
    c = c.replace(bad, good)

# Fix remaining hardcoded white/opacity tokens
color_fixes = [
    ("bg-white/5 p-1 rounded-full border border-white/5", "bg-space-card2 p-1 rounded-full border border-space-border"),
    ("p-6 bg-white/5 rounded-2xl border border-white/10 flex flex-col md:flex-row", "p-6 bg-space-card2/50 rounded-2xl border border-space-border flex flex-col md:flex-row"),
    ("w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10", "w-24 h-24 rounded-2xl bg-space-card2 flex items-center justify-center border border-space-border"),
    ("px-4 py-2 bg-black/30 border border-white/10 rounded-xl text-[10px] text-white/80 font-mono", "px-4 py-2 bg-space-card2 border border-space-border rounded-xl text-[10px] text-space-text font-mono"),
    ("p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white", "p-2 bg-space-card2 hover:bg-space-border border border-space-border rounded-xl text-space-text"),
    ("w-24 bg-white/10 h-1.5 rounded-full", "w-24 bg-space-border/50 h-1.5 rounded-full"),
    ("text-xs text-white/35 font-normal", "text-xs text-space-muted font-normal"),
    ("'text-white/40 hover:text-white/60'", "'text-space-muted hover:text-space-text'"),
]

for old, new in color_fixes:
    if old in c:
        c = c.replace(old, new)
        print(f"Fixed: {old[:40]}...")

# Handle the remaining toggle track bg (bg-white/10 in JSX conditionals)  
# These are in the form: ... ? 'bg-space-primary' : 'bg-white/10'}`}
c = c.replace("'bg-space-primary' : 'bg-white/10'", "'bg-space-primary' : 'bg-space-card2'")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'Done. Characters: {original_len} -> {len(c)}')
