# Annly Reserve - MVP

Sistema de reservas para barberías con capacidades PWA.

## 🚀 Stack Tecnológico

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Netlify Functions (Serverless)
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Hosting:** Netlify
- **PWA:** Service Workers + Web App Manifest

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── common/         # Componentes reutilizables (Button, Input, Modal, etc.)
│   ├── layout/         # Layouts (Navbar, Sidebar, DashboardLayout)
│   ├── booking/        # Componentes de reserva pública
│   ├── dashboard/      # Componentes del dashboard
│   ├── barbers/        # Gestión de barberos
│   ├── services/       # Gestión de servicios
│   └── settings/       # Configuración
├── pages/              # Páginas de la aplicación
│   ├── public/         # Páginas públicas (Home, Booking)
│   ├── auth/           # Autenticación (Login, Signup)
│   └── dashboard/      # Dashboard protegido
├── contexts/           # React Contexts (Auth, Business, Appointments)
├── hooks/              # Custom hooks
├── services/           # Servicios API
├── types/              # TypeScript types
└── utils/              # Funciones utilitarias

netlify/
└── functions/          # Netlify Functions (API endpoints)

supabase/
└── migrations/         # Database migrations
```

## 🗄️ Base de Datos

El esquema de la base de datos incluye 8 tablas principales:

1. **businesses** - Información de negocios
2. **users_businesses** - Relación usuarios-negocios con roles
3. **barbers** - Barberos del negocio
4. **services** - Servicios ofrecidos
5. **barbers_services** - Relación barberos-servicios
6. **schedules** - Horarios de trabajo
7. **appointments** - Citas reservadas
8. **notifications** - Registro de notificaciones

### Configurar Base de Datos

1. Crear proyecto en [Supabase](https://supabase.com)
2. Copiar las credenciales a `.env`:
   ```bash
   cp .env.example .env
   ```
3. Ejecutar el script de migración en el SQL Editor de Supabase:
   ```bash
   supabase/migrations/001_initial_schema.sql
   ```

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev
```

## 🌐 Variables de Entorno

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## 📝 Funcionalidades del MVP

### ✅ Fase 1: Setup Inicial (Completado)
- [x] Estructura de carpetas
- [x] Configuración TypeScript + ESLint
- [x] Configuración TailwindCSS
- [x] Esquema de base de datos
- [x] Tipos TypeScript
- [x] Utilidades helper

### 🚧 Fase 2: Autenticación y Roles (En progreso)
- [ ] AuthContext
- [ ] Páginas de login/signup
- [ ] Sistema de roles
- [ ] Protección de rutas

### 📋 Fase 3: Gestión de Negocio
- [ ] BusinessContext
- [ ] CRUD de servicios
- [ ] CRUD de barberos
- [ ] Editor de horarios

### 📅 Fase 4: Sistema de Reservas
- [ ] Algoritmo de disponibilidad
- [ ] Página pública de reservas
- [ ] Flujo de reserva completo
- [ ] Sistema de notificaciones

### 📊 Fase 5: Dashboard
- [ ] Calendario de citas
- [ ] Cancelación/reprogramación
- [ ] Vistas por rol
- [ ] Estadísticas básicas

### 📱 Fase 6: PWA
- [ ] Configuración PWA
- [ ] Optimizaciones
- [ ] Testing
- [ ] Deploy a producción

## 🎯 Roles y Permisos

- **Owner:** Control total del negocio
- **Admin:** Gestión de barberos, servicios, citas
- **Staff:** Ver y gestionar sus propias citas

## 📖 Documentación

Ver [implementation_plan.md](./docs/implementation_plan.md) para detalles técnicos completos.

## 🚀 Deploy

```bash
# Build para producción
npm run build

# Deploy a Netlify (automático con git push)
git push origin main
```

## 📄 Licencia

Privado - Todos los derechos reservados
