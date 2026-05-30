# 🧭 GUÍA COMPLETA DE NAVEGACIÓN - Annly Reserve

## 📌 ANTES DE EMPEZAR: CÓMO VER EL PROYECTO

### Opción 1: Desde VS Code (Recomendado)
```bash
# Abre VS Code en la carpeta del proyecto
code C:\Users\loann\annly-reserve

# O dentro de VS Code: File → Open Folder → selecciona annly-reserve
```

### Opción 2: Desde Terminal (PowerShell)
```bash
cd C:\Users\loann\annly-reserve
# Ahora estás en la carpeta raíz del proyecto
```

---

# 🌳 ESTRUCTURA DEL PROYECTO - EXPLICADO SIMPLE

## Visualiza todo con este árbol:

```
C:\Users\loann\annly-reserve/
│
├── 📄 package.json              ← Define qué librerías necesitas
├── 📄 .env                      ← Variables secretas (NO subir a Git)
├── 📄 vite.config.ts            ← Configuración del servidor local
├── 📄 tsconfig.json             ← Configuración de TypeScript
├── 📄 README.md                 ← Descripción del proyecto
├── 📄 QUICKSTART.md             ← Comandos para empezar rápido
│
├── 📁 src/                      ← ⭐ AQUÍ ESTÁ TODO EL CÓDIGO
│   ├── App.tsx                  ← El archivo principal (todas las rutas aquí)
│   ├── main.tsx                 ← Punto de entrada (NO modificar)
│   ├── index.css                ← Estilos globales
│   ├── supabaseClient.ts        ← Conexión a la BD
│   │
│   ├── 📁 components/           ← Bloques reutilizables (botones, formularios, etc)
│   │   ├── common/              ← Componentes básicos (Button, Input, Modal)
│   │   ├── auth/                ← Login, Signup, protección de rutas
│   │   ├── layout/              ← Header, Footer, Sidebar
│   │   └── calendar/            ← Componentes de calendario
│   │
│   ├── 📁 pages/                ← Páginas completas (lo que ves en pantalla)
│   │   ├── Home.tsx             ← Página inicio (/)
│   │   ├── auth/                ← Login, Signup (/login, /signup)
│   │   ├── public/
│   │   │   └── BookingPage.tsx  ← Página de reservas (/book/:slug)
│   │   └── dashboard/           ← Panel de control (protegido)
│   │       ├── DashboardHome.tsx
│   │       ├── ServicesPage.tsx
│   │       ├── BarbersPage.tsx
│   │       ├── SchedulesPage.tsx
│   │       └── AppointmentsPage.tsx
│   │
│   ├── 📁 contexts/             ← Estado global (Auth, Negocio)
│   │   ├── AuthContext.tsx      ← ¿Quién está logueado?
│   │   ├── BusinessContext.tsx  ← ¿Qué negocio estamos viendo?
│   │   ├── ThemeContext.tsx     ← Tema claro/oscuro
│   │   └── ToastContext.tsx     ← Notificaciones emergentes
│   │
│   ├── 📁 hooks/                ← Funciones reutilizables
│   │   ├── useAppointments.ts   ← Obtener citas
│   │   ├── useAvailability.ts   ← Calcular horarios disponibles
│   │   ├── useBarbers.ts        ← Obtener barberos
│   │   ├── useServices.ts       ← Obtener servicios
│   │   ├── useSchedule.ts       ← Obtener horarios
│   │   └── usePermissions.ts    ← Verificar permisos (owner, admin, staff)
│   │
│   ├── 📁 services/             ← Conexión con Supabase (BD)
│   │   ├── auth.service.ts      ← Login, Signup, password reset
│   │   ├── appointments.service.ts  ← Crear/editar/cancelar citas
│   │   ├── availability.service.ts  ← Calcular horarios libres
│   │   ├── barbers.service.ts       ← Gestionar barberos
│   │   ├── services.service.ts      ← Gestionar servicios (corte, barba)
│   │   ├── schedules.service.ts     ← Gestionar horarios de trabajo
│   │   ├── business.service.ts      ← Info del negocio
│   │   └── notifications.service.ts ← Enviar emails/SMS
│   │
│   ├── 📁 types/                ← Definiciones de tipos (TypeScript)
│   │   ├── user.types.ts        ← tipo Usuario, UserRole
│   │   ├── business.types.ts    ← tipo Negocio
│   │   ├── appointment.types.ts ← tipo Cita
│   │   ├── service.types.ts     ← tipo Servicio
│   │   ├── barber.types.ts      ← tipo Barbero
│   │   └── schedule.types.ts    ← tipo Horario
│   │
│   └── 📁 utils/                ← Funciones auxiliares
│       ├── dateUtils.ts         ← Manejo de fechas
│       ├── formatters.ts        ← Formatear datos para mostrar
│       └── validators.ts        ← Validar formularios
│
├── 📁 public/                   ← Archivos estáticos (imágenes, iconos)
│   ├── manifest.json            ← PWA (app web instalable)
│   └── service-worker.js        ← Offline support
│
├── 📁 netlify/
│   └── functions/               ← Funciones serverless (backend)
│       ├── create-appointment.js
│       └── get-appointments.js
│
└── 📁 supabase/
    └── migrations/
        └── 001_initial_schema.sql  ← Script para crear tablas en BD
```

---

# 🚀 CÓMO EJECUTAR EL PROYECTO LOCALMENTE

## Paso 1: Instalar dependencias
```bash
npm install
```
Esto descarga todas las librerías necesarias (React, Supabase, etc).  
Se crea una carpeta `node_modules/` (no modificar, no subir a Git).

## Paso 2: Crear archivo .env
```bash
# En la raíz del proyecto (C:\Users\loann\annly-reserve\)
# Crea un archivo llamado: .env
```

Adentro del `.env`, agrega:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**¿De dónde sacas eso?**
- Ve a https://supabase.com
- Entra a tu proyecto
- Settings → API
- Copia el "Project URL" y la clave "anon public"

## Paso 3: Ejecutar el servidor local
```bash
npm run dev
```

Deberías ver:
```
  VITE v5.4.2  ready in 456 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## Paso 4: Abre tu navegador
```
http://localhost:5173/
```

¡Listo! Ya ves el proyecto en acción.

---

# 🗺️ CÓMO NAVEGAR POR LAS DIFERENTES SECCIONES

## 1. PÁGINA DE INICIO (Home)
**URL:** `http://localhost:5173/`  
**Archivo:** `src/pages/Home.tsx`

✅ Qué ves:
- Presentación del proyecto
- Botones de "Crear Cuenta" y "Iniciar Sesión"
- Información sobre características

---

## 2. CREAR CUENTA (Signup)
**URL:** `http://localhost:5173/signup`  
**Archivo:** `src/pages/auth/SignupPage.tsx`

✅ Qué pasa aquí:
1. Completas: email, contraseña, nombre
2. Das click en "Crear Cuenta"
3. Se guarda en Supabase (BD en la nube)
4. Se crea tu usuario
5. Te redirige al login

📝 **Código que lo hace:**
```typescript
// En SignupPage.tsx
const handleSignup = async (email, password, name) => {
  const { data, error } = await authService.signUp(email, password, name);
  if (error) {
    mostrarError(error);
  } else {
    irA('/login');
  }
};
```

---

## 3. INICIAR SESIÓN (Login)
**URL:** `http://localhost:5173/login`  
**Archivo:** `src/pages/auth/LoginPage.tsx`

✅ Qué pasa aquí:
1. Escribes email y contraseña
2. Das click en "Iniciar Sesión"
3. Supabase valida tus credenciales
4. Se guarda tu sesión en el navegador
5. Se redirige al dashboard

---

## 4. PÁGINA DE RESERVAS (Público)
**URL:** `http://localhost:5173/book/barberia-juan`  
**Archivo:** `src/pages/public/BookingPage.tsx`

⭐ **LA MÁS IMPORTANTE** - Cliente hace una reserva

✅ Flujo de 5 pasos:
```
PASO 1: Selecciona SERVICIO
   ↓ (usa: getServices de services.service.ts)
PASO 2: Elige BARBERO disponible
   ↓ (usa: getBarbers de barbers.service.ts)
PASO 3: Selecciona FECHA en calendario
   ↓ (usa: getAvailableSlots de availability.service.ts)
PASO 4: Elige HORA disponible
   ↓
PASO 5: Completa DATOS (nombre, teléfono)
   ↓
CREAR CITA
   ↓ (usa: createAppointment de appointments.service.ts)
✅ ¡CITA CONFIRMADA!
```

---

## 5. DASHBOARD (Panel de Control Protegido)
**URL:** `http://localhost:5173/dashboard`  
**Archivo:** `src/pages/dashboard/DashboardHome.tsx`

⚠️ **Requiere estar logueado**

✅ Qué puedes hacer (según tu rol):

### 📊 Dashboard Home
- Ver resumen del negocio
- Próximas citas
- Estadísticas

### 🔧 Gestionar Servicios
**URL:** `/dashboard/services`  
**Archivo:** `src/pages/dashboard/ServicesPage.tsx`

✅ Puedes:
- Ver todos los servicios (Corte Clásico, Barba, Diseño, etc)
- ➕ Crear nuevo servicio
- ✏️ Editar servicio (nombre, precio, duración)
- 🗑️ Eliminar servicio

📝 Código:
```typescript
// Ver servicios
const { services } = useServices(businessId);

// Crear servicio
const handleCreate = async (name, price, duration) => {
  await servicesService.createService(businessId, { name, price, duration });
  refrescarLista();
};
```

### 👨‍💼 Gestionar Barberos
**URL:** `/dashboard/barbers`  
**Archivo:** `src/pages/dashboard/BarbersPage.tsx`

✅ Puedes:
- Ver lista de barberos
- ➕ Crear nuevo barbero
- ✏️ Editar nombre, email, teléfono
- ✅ Activar/Desactivar barbero
- Asignar servicios que hace cada barbero

### 🕐 Configurar Horarios
**URL:** `/dashboard/schedules`  
**Archivo:** `src/pages/dashboard/SchedulesPage.tsx`

✅ Puedes:
- Definir horarios por día (Lunes-Domingo)
- Para cada barbero
- Ejemplo: "Juan atiende 8am-6pm Lunes-Viernes"
- Marcar "Día libre" para no atender

### 📅 Ver Citas
**URL:** `/dashboard/appointments`  
**Archivo:** `src/pages/dashboard/AppointmentsPage.tsx`

✅ Puedes:
- Ver TODAS las citas del negocio
- Filtrar por estado (Confirmada, Cancelada, Completada, No presentó)
- Filtrar por barbero o servicio
- ✏️ Editar estado de cita
- ➕ Crear cita manualmente
- 🗑️ Cancelar cita

---

# 🔄 CÓMO FLUYEN LOS DATOS (Lo importante para entender)

## Diagrama de flujo de datos:

```
┌──────────────────┐
│   USUARIO VE      │
│  (en el navegador)│
└────────┬─────────┘
         │
         │ hace click, llena formulario
         ▼
┌──────────────────────────┐
│  COMPONENTE REACT        │  ← Por ejemplo: BookingPage.tsx
│  (pages/public/...)      │
└────────┬─────────────────┘
         │
         │ llama un HOOK
         ▼
┌──────────────────────────┐
│  CUSTOM HOOK             │  ← Por ejemplo: useAvailability.ts
│  (hooks/use*.ts)         │    O useAppointments.ts
└────────┬─────────────────┘
         │
         │ llama un SERVICE
         ▼
┌──────────────────────────┐
│  SERVICE (SUPABASE)      │  ← Por ejemplo: appointments.service.ts
│  (services/*.ts)         │
└────────┬─────────────────┘
         │
         │ HTTP request
         ▼
┌──────────────────────────┐
│  SUPABASE (en la nube)   │
│  Base de datos PostgreSQL│
└──────────────────────────┘
```

### Ejemplo Real: Crear una Cita

1. **Cliente en BookingPage.tsx** escribes nombre y haces click en "Reservar"
   ```typescript
   const handleBooking = async () => {
     // Aquí estamos en BookingPage
   ```

2. **Se llama el hook useAppointments** 
   ```typescript
   const { createAppointment } = useAppointments(businessId);
   ```

3. **El hook llama al service**
   ```typescript
   // En useAppointments.ts
   const appointment = await appointmentsService.createAppointment(data);
   ```

4. **El service envía datos a Supabase**
   ```typescript
   // En appointments.service.ts
   const { data, error } = await supabase
     .from('appointments')
     .insert([appointmentData]);
   ```

5. **Supabase guarda en la BD** (tabla "appointments")

6. **Respuesta vuelve al componente** y se actualiza la pantalla

---

# 🧠 CONCEPTOS CLAVE PARA NAVEGAR

## Context API (Estado Global)

### AuthContext - ¿Quién soy?
```typescript
// En cualquier componente
const { user, role, signIn, signOut } = useAuth();

// Ejemplo:
if (!user) {
  return <Redirect to="/login" />;
}

if (role !== 'owner') {
  return <p>Solo el dueño puede acceder</p>;
}
```

**Dónde:** `src/contexts/AuthContext.tsx`

### BusinessContext - ¿Qué negocio estoy usando?
```typescript
// En cualquier componente
const { business, services, barbers } = useBusiness();

// Ejemplo:
<h1>Bienvenido a {business.name}</h1>
<p>Tienes {services.length} servicios</p>
```

**Dónde:** `src/contexts/BusinessContext.tsx`

---

## Routes (Rutas - Navegación)

**Dónde:** `src/App.tsx`

```typescript
<Routes>
  {/* PÚBLICO - sin login */}
  <Route path="/" element={<Home />} />
  <Route path="/book/:slug" element={<BookingPage />} />
  
  {/* AUTH - sin login */}
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  
  {/* PROTEGIDO - requiere login + rol owner */}
  <Route 
    path="/dashboard" 
    element={
      <AuthGuard>
        <RequireOwner>
          <DashboardHome />
        </RequireOwner>
      </AuthGuard>
    } 
  />
</Routes>
```

---

# 🔐 ROLES Y PERMISOS (Importante)

## 3 Roles diferentes:

### Owner (Dueño)
✅ Puede:
- Ver/crear/editar servicios
- Ver/crear/editar barberos
- Ver/editar horarios
- Ver todas las citas
- Cambiar suscripción
- Acceder a IA Assistant

❌ No puede:
- Ver otros negocios

**Cómo verificar en código:**
```typescript
const { role } = useAuth();
if (role !== 'owner') {
  return <p>Solo owner</p>;
}
```

### Admin (Administrador)
✅ Puede:
- Lo mismo que Owner (excepto facturación)

### Staff (Personal)
✅ Puede:
- Ver sus propias citas
- Marcar cita como completada

---

# 📊 BASE DE DATOS - LAS 8 TABLAS

```
┌─────────────────────────────────────────────────────┐
│ businesses                                           │
├─────────────────────────────────────────────────────┤
│ id, name, slug, owner_id, contact, location         │
│ Ejemplo: {"name": "Barbería Juan", "slug": "juan"}  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ users_businesses (relación)                         │
├─────────────────────────────────────────────────────┤
│ user_id, business_id, role (owner/admin/staff)      │
│ Ejemplo: Juan es OWNER de Barbería Juan             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ services                                             │
├─────────────────────────────────────────────────────┤
│ id, business_id, name, price, duration_minutes      │
│ Ejemplo: {"name": "Corte", "price": 500, "duration": 30}
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ barbers                                              │
├─────────────────────────────────────────────────────┤
│ id, business_id, name, email, phone, is_active      │
│ Ejemplo: {"name": "Carlos", "email": "c@email.com"} │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ barbers_services (relación Many-to-Many)            │
├─────────────────────────────────────────────────────┤
│ barber_id, service_id                               │
│ Ejemplo: Carlos hace "Corte" y "Diseño"             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ schedules                                            │
├─────────────────────────────────────────────────────┤
│ id, barber_id, day_of_week (0-6), start_time, end   │
│ Ejemplo: Carlos Lunes 8:00 AM - 6:00 PM             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ appointments                                         │
├─────────────────────────────────────────────────────┤
│ id, service_id, barber_id, client_name, scheduled_at│
│ Ejemplo: Juan reserva corte con Carlos 24/5 10am    │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ notifications                                        │
├─────────────────────────────────────────────────────┤
│ id, appointment_id, type, recipient, status         │
│ Ejemplo: Email enviado a juan@email.com             │
└─────────────────────────────────────────────────────┘
```

---

# 💡 CÓMO ENCONTRAR LO QUE BUSCAS

## Buscas: "Dónde se crea una cita"
```
1. Abre: src/pages/public/BookingPage.tsx
   → Es el formulario que llena el cliente

2. Mira qué hook usa:
   const { createAppointment } = useAppointments(businessId);

3. Ve a: src/hooks/useAppointments.ts
   → Aquí está la lógica

4. El hook llama a:
   appointmentsService.createAppointment(data)

5. Ve a: src/services/appointments.service.ts
   → Aquí se envía a Supabase
```

## Buscas: "Dónde se valida el email"
```
1. Abre: src/utils/validators.ts
   → Verás función isValidEmail()

2. Se usa en: src/pages/auth/SignupPage.tsx
   → Antes de permitir crear cuenta
```

## Buscas: "Dónde se define el tipo Appointment"
```
1. Ve a: src/types/appointment.types.ts
   → Aquí está: interface Appointment { ... }
```

---

# 🎨 CÓMO HACER CAMBIOS

## Cambio 1: Agregar un nuevo campo a formulario de Signup

**Archivos a modificar:**

1. **Tipo** (`src/types/user.types.ts`):
   ```typescript
   export interface User {
     id: string;
     email: string;
     phone: string;  // ← AGREGAR
   }
   ```

2. **Página** (`src/pages/auth/SignupPage.tsx`):
   ```typescript
   const [phone, setPhone] = useState('');
   
   return (
     <form>
       <Input value={email} onChange={(e) => setEmail(e.target.value)} />
       <Input value={phone} onChange={(e) => setPhone(e.target.value)} />  {/* ← AGREGAR */}
       <Button onClick={handleSignup}>Crear Cuenta</Button>
     </form>
   );
   ```

3. **Service** (`src/services/auth.service.ts`):
   ```typescript
   const signUp = async (email, password, phone) => {  // ← AGREGAR phone
     const { data, error } = await supabase.auth.signUp({
       email,
       password,
       data: { phone }  // ← AGREGAR
     });
   };
   ```

---

## Cambio 2: Agregar nuevo campo a Cita

1. **Tipo** (`src/types/appointment.types.ts`):
   ```typescript
   export interface Appointment {
     id: string;
     notes: string;       // Agrega aquí
   }
   ```

2. **BD** (`supabase/migrations/001_initial_schema.sql`):
   ```sql
   ALTER TABLE appointments ADD COLUMN notes TEXT;
   ```
   (Ejecuta esto en Supabase SQL Editor)

3. **Service** (`src/services/appointments.service.ts`):
   ```typescript
   const createAppointment = async (data) => {
     // Ahora incluye data.notes
   };
   ```

4. **Componente** (`src/pages/public/BookingPage.tsx`):
   ```typescript
   <textarea 
     placeholder="Notas adicionales..."
     value={notes}
     onChange={(e) => setNotes(e.target.value)}
   />
   ```

---

# 🐛 CÓMO DEBUGGEAR (Si algo no funciona)

## Paso 1: Abre la consola del navegador
```
F12 → Console
```

## Paso 2: Busca errores rojos
Si ves algo rojo, léelo. Generalmente dice qué está mal.

## Paso 3: Si dice "No se puede crear cita"
```
1. ¿Tienes credenciales de Supabase en .env?
   → Sin .env valido, no funciona nada

2. ¿Está Supabase online?
   → Ve a: https://status.supabase.com

3. Abre DevTools → Network
   → Mira la petición a Supabase
   → ¿Responde 200 (OK) o 401 (error de auth)?

4. Si es 401, tu clave de Supabase está mal
   → Verifica .env nuevamente
```

## Paso 4: Si la página "no carga servicios"
```typescript
// Agrega console.log para debuggear
const { services, loading, error } = useServices(businessId);

console.log('Services:', services);
console.log('Loading:', loading);
console.log('Error:', error);
```

---

# 🚀 PRÓXIMOS PASOS RECOMENDADOS

## Para aprender el código:

1. **Entiende la estructura**
   - Lee esta guía 📖
   - Abre VS Code y explora las carpetas
   
2. **Sigue una ruta (flow)**
   - Haz signup en `http://localhost:5173/signup`
   - Luego ve a dashboard `/dashboard`
   - Abre DevTools y mira Network → qué se envía a Supabase
   
3. **Modifica algo pequeño**
   - Cambia un color en TailwindCSS
   - Cambia un texto de un botón
   - Guarda y mira cómo se actualiza automáticamente (Hot Reload)

4. **Agrega un campo nuevo** (según cambio 1 o 2 arriba)
   - Empieza por tipos (.ts)
   - Luego componente (.tsx)
   - Luego service (.ts)

5. **Debuggea activamente**
   - Aprende a usar DevTools
   - Lee los errores en console
   - Entiende qué hace cada archivo

---

# 📞 REFERENCIA RÁPIDA

| Necesito... | Voy a... |
|-------------|----------|
| Crear una nueva página | `src/pages/` + agregar en `App.tsx` |
| Crear un componente reutilizable | `src/components/common/` |
| Obtener datos de BD | `src/services/` + `src/hooks/` |
| Definir tipo de dato | `src/types/` |
| Autenticación | `src/contexts/AuthContext.tsx` + `useAuth()` |
| Cambiar estilos | TailwindCSS en componentes |
| Agregar función helper | `src/utils/` |
| Proteger ruta por rol | `<AuthGuard>` + `<RequireOwner>` |
| Ver datos del negocio | `useBusiness()` |
| Ver usuario logueado | `useAuth()` |

---

**Última actualización:** Mayo 24, 2026  
**Proyecto:** Annly Reserve  
**Estado:** MVP Funcional
