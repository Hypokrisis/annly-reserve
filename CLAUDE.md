# CLAUDE.md - Guía Completa para Trabajar en Annly Reserve

## 🎯 ¿Qué es Annly Reserve?

**Annly Reserve** es una plataforma SaaS de reservas para barberías y salones de belleza. Es una Progressive Web App (PWA) que permite:

- **Para Dueños/Admins**: Gestionar servicios, barberos, horarios, citas y notificaciones
- **Para Clientes**: Reservar citas online de forma fácil a través de un link público

Es un **MVP (Mínimo Producto Viable)** con funcionalidades core implementadas y listo para monetizar.

---

## 🏗️ Stack Tecnológico

| Aspecto | Tecnología |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilos** | TailwindCSS |
| **Backend** | Netlify Functions (Serverless) |
| **Base de Datos** | Supabase (PostgreSQL) |
| **Autenticación** | Supabase Auth |
| **Hosting** | Netlify + Supabase |
| **PWA** | Service Workers + Web App Manifest |
| **Otras** | React Router, Lucide Icons, date-fns |

---

## 📊 Estructura Base de Datos

8 tablas principales en PostgreSQL (Supabase):

1. **businesses** - Información de negocios
2. **users_businesses** - Usuarios con roles (owner/admin/staff)
3. **barbers** - Barberos registrados
4. **services** - Servicios ofrecidos
5. **barbers_services** - Relación muchos-a-muchos
6. **schedules** - Horarios de trabajo semanal
7. **appointments** - Citas reservadas
8. **notifications** - Log de notificaciones (email, SMS, etc.)

**Todas tienen Row Level Security (RLS) configurado para filtrar por business_id y roles.**

---

## 📁 Estructura de Carpetas

```
src/
├── components/
│   ├── common/              # Button, Input, Modal, ImageUploadWithCrop, etc.
│   ├── layout/              # DashboardLayout, Navbar, Sidebar
│   ├── booking/             # Flujo de reserva (5 pasos)
│   ├── dashboard/           # Dashboard home, stats
│   ├── barbers/             # CRUD de barberos
│   ├── services/            # CRUD de servicios
│   ├── appointments/        # Gestión de citas
│   ├── settings/            # Configuración del negocio
│   └── GeminiChatWidget.tsx # Widget de AI (Gemini)
├── pages/
│   ├── Home.tsx             # Página de inicio
│   ├── auth/                # LoginPage.tsx, SignupPage.tsx
│   └── dashboard/           # DashboardHome.tsx, AIAssistantPage.tsx
├── contexts/                # AuthContext, BusinessContext
├── hooks/
│   ├── useChatHistory.ts    # Gestión de historial de chat
│   ├── useAppointments.ts   # CRUD de citas
│   ├── useAvailability.ts   # Algoritmo de disponibilidad
│   ├── useBarbers.ts        # CRUD de barberos
│   ├── useServices.ts       # CRUD de servicios
│   └── useSchedule.ts       # Gestión de horarios
├── services/                # Lógica de API
│   ├── appointments.service.ts
│   ├── availability.service.ts
│   ├── barbers.service.ts
│   ├── business.service.ts
│   ├── notifications.service.ts
│   ├── schedules.service.ts
│   └── services.service.ts
├── types/                   # TypeScript interfaces
├── utils/                   # Helpers y utilidades
├── index.css                # Estilos globales (Tailwind + custom CSS variables)
└── supabaseClient.ts        # Instancia de Supabase

netlify/
└── functions/
    └── chat.ts              # Endpoint serverless para AI (Gemini)

public/
├── manifest.json            # PWA manifest
└── service-worker.js        # Service worker para offline
```

---

## 🔑 Características Implementadas

### ✅ Autenticación & Autorización
- Login/Signup con Supabase
- AuthContext centralizado
- Roles: owner, admin, staff
- Rutas protegidas
- Recuperación de contraseña

### ✅ Gestión del Negocio (Dashboard)
- Crear/editar información del negocio
- CRUD de Servicios
- CRUD de Barberos + asignación de servicios
- Editor visual de horarios semanales
- Sidebar con navegación

### ✅ Sistema de Reservas
- Página pública `/book/:slug`
- Flujo de 5 pasos intuitivo
- Algoritmo inteligente de disponibilidad
- Validaciones de conflictos
- Dashboard de citas del admin

### ✅ Notificaciones
- Sistema preparado para email/SMS
- Log de notificaciones en BD
- Recordatorios (ready to implement)

### ✅ PWA
- Web App Manifest
- Service Worker
- Instalable en móvil
- Funciona offline (parcialmente)

### ✅ Integración AI (Nueva)
- **GeminiChatWidget.tsx** - Widget de chat con Gemini
- **chat.ts** (Netlify Function) - Endpoint serverless para procesar prompts
- **useChatHistory.ts** - Hook para gestionar historial de conversaciones

---

## 🚀 Comandos Esenciales

```bash
# Instalar dependencias
npm install

# Desarrollo local (hot reload)
npm run dev

# Build para producción
npm run build

# Preview de build
npm run preview

# Linting y type check
npm run lint
npm typecheck
```

---

## 🌐 Variables de Entorno

Crear `.env` (o `.env.local`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key  # Para AI
```

---

## 🎯 Próximas Tareas Típicas

1. **Agregar nuevas funcionalidades al dashboard** → Buscar en `src/pages/dashboard/`
2. **Mejorar el flujo de reserva** → Modificar `src/components/booking/`
3. **Agregar campos a la BD** → Crear migrations en Supabase
4. **Implementar nuevas API endpoints** → Crear en `netlify/functions/`
5. **Mejorar UI/UX** → Editar componentes con Tailwind
6. **Trabajar con el AI Widget** → Editar `GeminiChatWidget.tsx`

---

## 💡 Reglas y Mejores Prácticas

### Código
- ✅ Usar TypeScript (siempre tipado)
- ✅ Nombrar componentes en PascalCase
- ✅ Nombrar funciones/variables en camelCase
- ✅ Funciones pequeñas y reutilizables
- ✅ Evitar archivos > 300 líneas

### Componentes
- ✅ Componentes funcionales con hooks
- ✅ Props bien tipados
- ✅ Usar componentes de `common/` cuando sea posible
- ✅ Estilos con Tailwind
- ✅ Accesibilidad: `aria-label`, roles correctos

### Base de Datos
- ✅ Siempre incluir RLS policies
- ✅ Usar tipos correctos (uuid, jsonb, timestamps)
- ✅ Nombrar columnas en snake_case
- ✅ Documentar cambios en migrations

### Git
- ✅ Commits descriptivos: "Add feature", "Fix bug"
- ✅ Hacer push regularmente
- ✅ Revisar `git diff` antes de commitear

---

## 🎓 Cómo Ayudarte

Como Claude AI, puedo:

✅ Crear nuevos componentes y páginas  
✅ Implementar nuevas funcionalidades  
✅ Debuggear problemas  
✅ Mejorar código existente  
✅ Escribir migraciones de BD  
✅ Optimizar performance  
✅ Revisar código (code review)  

**Para ser más efectivo, dame contexto claro:**
- ¿Qué quieres lograr exactamente?
- ¿Qué error específico ves?
- ¿En qué archivo está el problema?

---

## 📞 Recursos Útiles

- Docs oficiales: React, Supabase, Vite, TailwindCSS
- Archivos del repo: `README.md`, `QUICKSTART.md`, `DEPLOYMENT.md`
- Base datos: `supabase/migrations/001_initial_schema.sql`

---

**Estado actual:** Annly Reserve MVP con Auth, Dashboard, Reservas, PWA e Integración AI activos