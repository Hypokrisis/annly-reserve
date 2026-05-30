# 🤖 DOCUMENTACIÓN PARA IA: ENTENDIMIENTO DEL CODEBASE

**Destinatario:** Modelos LLM de lenguaje (Ollama, Claude, GPT, Copilot, etc)  
**Propósito:** Explicación técnica para que otra IA entienda el proyecto y trabaje autónomamente  
**Nivel:** Arquitectura, patrones, flujos, no código específico

---

## 🏗️ PARTE 1: ARQUITECTURA GENERAL

### 1.1 Tipo de Proyecto
- **Categoría:** SaaS (Software as a Service) - Plataforma multitenante
- **Dominio:** Sistema de reservas para barberías
- **Modelo:** Negocio A (barbería) → Dueño configura → Cliente (B2C) reserva en línea
- **Estado:** MVP funcional con usuarios reales

### 1.2 Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│ PRESENTACIÓN (React + TypeScript)       │
│ - Componentes (.tsx)                    │
│ - Páginas completas                     │
│ - Contextos (estado global)             │
│ - Hooks (lógica encapsulada)            │
└─────────────────────┬───────────────────┘
                      │ Abstracción
┌─────────────────────▼───────────────────┐
│ LÓGICA DE NEGOCIO (Hooks + Services)   │
│ - Custom hooks (useAppointments, etc)   │
│ - Servicios (appointments.service, etc) │
│ - Contextos globales                    │
└─────────────────────┬───────────────────┘
                      │ HTTP + REST
┌─────────────────────▼───────────────────┐
│ PERSISTENCIA (Supabase)                 │
│ - PostgreSQL (8 tablas)                 │
│ - Auth built-in                         │
│ - RLS (seguridad por fila)              │
└─────────────────────────────────────────┘
```

### 1.3 Tecnologías Core

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Frontend | React 18 + TypeScript | Componentes tipados, hooks avanzados |
| Bundler | Vite 5 | Hot reload ultra-rápido |
| Estilos | TailwindCSS | Utilidades, responsive fácil |
| Routing | React Router 7 | SPA sin reloads |
| BD | Supabase | PostgreSQL managed + Auth |
| Backend | Netlify Functions | Serverless, solo si lo necesitas |

---

## 🔄 PARTE 2: PATRONES ARQUITECTÓNICOS

### 2.1 Patrón: Separación por Capas

**Principio:** Cada capa tiene responsabilidad única

```
COMPONENTE (ui.tsx)
    ↓
HOOK (useX.ts)          ← Lógica React (useState, useEffect)
    ↓
SERVICE (X.service.ts)  ← Lógica de negocio (queries a BD)
    ↓
SUPABASE               ← Persistencia (BD)
```

**Ejemplo Real:**
```
BookingPage.tsx (componente UI)
    ↓ usa
useAppointments(businessId) (hook)
    ↓ llama
appointmentsService.createAppointment(data) (service)
    ↓ realiza
INSERT INTO appointments VALUES (...) (SQL en BD)
```

### 2.2 Patrón: Contextos para Estado Global

**Principio:** Estado compartido entre muchos componentes vive en Context

```typescript
// AuthContext: ¿Quién soy?
const { user, role, signIn, signOut } = useAuth();

// BusinessContext: ¿Qué negocio estoy usando?
const { business, services, barbers } = useBusiness();
```

**Regla:** Cada Context solo maneja UN dominio (auth, business, theme, toast)

### 2.3 Patrón: Tipos para Seguridad

**Principio:** NO usar `any` en TypeScript

```typescript
// ✅ CORRECTO
interface Appointment {
  id: string;
  scheduled_at: Date;
  status: 'confirmed' | 'cancelled';
}

// ❌ INCORRECTO
const appointment: any = ...
```

### 2.4 Patrón: Rutas Protegidas por Rol

**Principio:** Verificación en múltiples niveles

```typescript
// Nivel 1: RequireOwner wrapper
<RequireOwner>
  <ServicePage />
</RequireOwner>

// Nivel 2: Hook dentro
const { role } = useAuth();
if (role !== 'owner') return <Redirect />;

// Nivel 3: BD (RLS)
// SELECT * FROM services WHERE business_id = current_user_business
```

---

## 📊 PARTE 3: ESTRUCTURA DE DATOS

### 3.1 Las 8 Tablas y Sus Relaciones

```
users (Supabase Auth)
    ↓ 1:N
users_businesses (relación)
    ↓
businesses (nivel de suscripción, info)
    ├─ 1:N ─→ services
    ├─ 1:N ─→ barbers
    │           ↓ N:N
    │         barbers_services ← servicios que hace cada barbero
    │
    ├─ barbers
    │   ↓ 1:N
    │   schedules (horarios trabajables)
    │
    └─ 1:N
        appointments (citas reservadas)
            ↓ 1:N
            notifications (registro de alertas enviadas)
```

### 3.2 Flujos de Datos Clave

#### Flujo 1: CREACIÓN DE CITA (Cliente)
```
Cliente accede: /book/:slug
    ↓
BookingPage obtiene: businessId por slug
    ↓
Paso 1: Selecciona service_id
Paso 2: Selecciona barber_id (filtrado por barbers_services)
Paso 3: Selecciona date
Paso 4: Selecciona hora de lista de disponibles
  ← availability.service calcula: schedules del barber - appointments existentes
Paso 5: Completa datos (nombre, teléfono)
    ↓
Crea: INSERT appointments (business_id, barber_id, service_id, client_name, scheduled_at)
    ↓
Notificación: INSERT notifications (type: 'sms', recipient: client_phone)
```

#### Flujo 2: CONFIGURACIÓN (Owner)
```
Owner accede: /dashboard
    ↓
Dashboard carga: business + servicios + barberos (por business_id)
    ↓
Owner CRUD:
  - Crear servicio: INSERT services
  - Crear barbero: INSERT barbers
  - Asignar servicios: INSERT barbers_services
  - Establecer horarios: INSERT schedules
    ↓
Los horarios + citas existentes determinan disponibilidad
```

#### Flujo 3: AUTENTICACIÓN
```
Usuario: email + password
    ↓
Supabase Auth valida
    ↓
JWT token guardado en localStorage
    ↓
Cada petición incluye Authorization header
    ↓
RLS verifica: ¿este usuario puede ver este negocio?
```

---

## 🧠 PARTE 4: CONVENCIONES Y PATRONES DE CÓDIGO

### 4.1 Naming Conventions (Convenciones de Nombres)

| Qué | Patrón | Ejemplo |
|-----|--------|---------|
| Componente | PascalCase | `BookingPage.tsx`, `ServiceCard.tsx` |
| Hook | use + PascalCase | `useAppointments.ts`, `useAvailability.ts` |
| Service | entity + .service | `appointments.service.ts` |
| Type/Interface | Nombre + tipo | `appointment.types.ts` |
| Carpeta | Nombre entidad (plural) | `services/`, `components/` |
| Función de negocio | verbo + Entity | `createAppointment()`, `getAvailableSlots()` |
| Variable boolean | is + adjetivo | `isLoading`, `isValid`, `isActive` |

### 4.2 Estructura de un Hook

**Patrón universal para custom hooks:**

```typescript
// src/hooks/useAppointments.ts
import { useState, useEffect } from 'react';
import { appointmentsService } from '@/services/appointments.service';
import type { Appointment } from '@/types/appointment.types';

export function useAppointments(businessId: string) {
  // 1. Estado
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 2. Cargar datos
  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        const data = await appointmentsService.getAppointments(businessId);
        setAppointments(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [businessId]);

  // 3. Funciones de acción
  const createAppointment = async (data: CreateAppointmentData) => {
    const result = await appointmentsService.createAppointment(data);
    setAppointments([...appointments, result]);
    return result;
  };

  // 4. Retornar estado + funciones
  return { appointments, loading, error, createAppointment };
}
```

### 4.3 Estructura de un Service

**Patrón universal para servicios:**

```typescript
// src/services/appointments.service.ts
import { supabase } from '@/supabaseClient';
import type { Appointment, CreateAppointmentData } from '@/types/appointment.types';

export const appointmentsService = {
  
  // GET - Leer
  async getAppointments(businessId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId);
    
    if (error) throw error;
    return data || [];
  },

  // POST - Crear
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const { data: result, error } = await supabase
      .from('appointments')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  },

  // PATCH - Actualizar
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // DELETE
  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
```

### 4.4 Estructura de un Tipo

```typescript
// src/types/appointment.types.ts

// 1. Tipos simples (enums)
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

// 2. Interface principal (de BD)
export interface Appointment {
  id: string;
  business_id: string;
  barber_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string; // ISO 8601
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// 3. DTO para crear (sin id, timestamps)
export interface CreateAppointmentData {
  business_id: string;
  barber_id: string;
  service_id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string;
}

// 4. DTO para actualizar (campos opcionales)
export interface UpdateAppointmentData {
  status?: AppointmentStatus;
  notes?: string;
}

// 5. Filtros
export interface AppointmentFilters {
  barberId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
  startDate?: Date;
  endDate?: Date;
}
```

---

## 🔑 PARTE 5: FLUJOS CRÍTICOS (Para IA)

### 5.1 Cómo el Código Fluye de Arriba a Abajo

```
Usuario interactúa en UI (componente .tsx)
    ↓
Componente llama: const { createAppointment } = useAppointments(businessId)
    ↓
Hook (useAppointments.ts) initializa con useState + useEffect
    ↓
Hook manda llamar: appointmentsService.createAppointment(data)
    ↓
Service (appointments.service.ts) ejecuta:
    supabase.from('appointments').insert([data])
    ↓
Supabase realiza:
    1. Valida con RLS: ¿usuario puede insertar en este business?
    2. INSERT en tabla PostgreSQL
    3. Retorna resultado
    ↓
Service devuelve datos tipados al Hook
    ↓
Hook actualiza estado: setAppointments([...appointments, result])
    ↓
Componente re-renderiza con nuevos datos
    ↓
Usuario ve cambios en pantalla
```

### 5.2 Cómo Encontrar Dónde Falla Algo

**Estrategia para IA:**

```
Problema: "No se crean citas"
    ↓
Paso 1: ¿Qué archivo maneja citas?
  → src/pages/public/BookingPage.tsx (componente)
  → src/hooks/useAppointments.ts (hook)
  → src/services/appointments.service.ts (service)
    ↓
Paso 2: ¿Cuál es el punto de entrada?
  → BookingPage.tsx (usuario interactúa aquí)
    ↓
Paso 3: Sigue el flujo:
  → ¿useAppointments() está siendo llamado?
  → ¿Hook está devolviendo createAppointment()?
  → ¿Service.createAppointment() llama a supabase?
  → ¿Supabase tiene credenciales válidas? (en .env)
  → ¿La tabla 'appointments' existe en BD?
  → ¿RLS permite INSERT? (verificar en BD)
    ↓
Paso 4: Debug específico:
  → console.log en BookingPage
  → console.log en useAppointments
  → console.log en service
  → DevTools Network tab para ver error de Supabase
```

### 5.3 Puntos de Modificación Comunes

| Feature | Archivos a Tocar |
|---------|-----------------|
| Agregar campo a formulario | types/ → pages/ → components/ |
| Agregar columna a BD | supabase/migrations/ → types/ → services/ |
| Crear CRUD nuevo | types/ → services/ → hooks/ → pages/ |
| Cambiar validación | utils/validators.ts → pages/ o services/ |
| Agregar protección por rol | components/auth/RequireRole.tsx → App.tsx |
| Cambiar UI | components/common/ o pages/ (TailwindCSS) |
| Agregar notificación | services/notifications.service.ts |

---

## 🔐 PARTE 6: SEGURIDAD Y PERMISOS

### 6.1 Capas de Seguridad

```
Capa 1: Autenticación (Supabase Auth)
  ↓ ¿El usuario está logueado?

Capa 2: Autorización (Roles)
  ↓ ¿El usuario tiene permiso para esta acción?

Capa 3: RLS (Row Level Security)
  ↓ ¿Puede acceder a estos datos específicos?
```

### 6.2 Roles y Permisos

```
OWNER (Dueño del negocio)
  ├─ CREATE: servicios, barberos, horarios, citas
  ├─ READ: TODO del negocio
  ├─ UPDATE: TODO del negocio
  ├─ DELETE: TODO del negocio
  └─ SPECIAL: acceso a suscripciones, IA assistant

ADMIN (Administrador)
  ├─ CREATE: servicios, barberos, horarios, citas
  ├─ READ: TODO del negocio
  ├─ UPDATE: TODO del negocio
  ├─ DELETE: TODO del negocio
  └─ SPECIAL: NADA (sin facturación)

STAFF (Personal)
  ├─ CREATE: ninguno
  ├─ READ: solo sus propias citas
  ├─ UPDATE: estado de citas (completada)
  ├─ DELETE: ninguno
  └─ SPECIAL: ninguno
```

### 6.3 Cómo Implementar Protección

```typescript
// En componente
import { useAuth } from '@/contexts/AuthContext';
import { RequireOwner } from '@/components/auth/RequireOwner';

// Opción 1: Wrapper
<RequireOwner>
  <ServicePage />
</RequireOwner>

// Opción 2: Hook
const { role } = useAuth();
if (role !== 'owner') {
  return <p>No autorizado</p>;
}

// Opción 3: En service
// RLS lo maneja automáticamente en BD
```

---

## 🛠️ PARTE 7: INSTRUCCIONES PARA OTRA IA

### 7.1 Antes de Tocar Código

1. **Entiende el contexto:**
   - ¿Qué feature estoy implementando?
   - ¿Qué tablas de BD afecta?
   - ¿Qué roles necesitan acceso?

2. **Sigue el patrón:**
   - tipos → services → hooks → componentes
   - No inventes estructuras nuevas

3. **Valida tipos:**
   - ¿Todos los valores están tipados?
   - ¿No hay ningún `any`?

4. **Verifica seguridad:**
   - ¿Hay control de rol?
   - ¿RLS está configurado?

### 7.2 Cuando Crees un CRUD Nuevo

**Checklist:**

```
[ ] Crear tipo en src/types/
    [ ] Interface principal (de BD)
    [ ] DTO para Create
    [ ] DTO para Update
    [ ] Enums si aplica

[ ] Crear service en src/services/
    [ ] Función GET (listar)
    [ ] Función POST (crear)
    [ ] Función PATCH (actualizar)
    [ ] Función DELETE (eliminar)
    [ ] Manejo de errores

[ ] Crear hook en src/hooks/
    [ ] useState para datos
    [ ] useState para loading
    [ ] useState para error
    [ ] useEffect para cargar
    [ ] Funciones de acción

[ ] Crear componente en src/pages/
    [ ] Importar hook
    [ ] Mostrar datos con .map()
    [ ] Formulario para crear
    [ ] Buttons para editar/eliminar
    [ ] Error handling

[ ] Agregar ruta en src/App.tsx
    [ ] Ruta pública o privada?
    [ ] ¿Requiere role específico?
    [ ] Envolver con <AuthGuard> si aplica

[ ] Verificar seguridad
    [ ] ¿Está el rol correcto?
    [ ] ¿RLS está en tabla?
    [ ] ¿Service verifica business_id?
```

### 7.3 Cuando Agregues Columna a BD

**Checklist:**

```
[ ] Crear migration en supabase/migrations/
    [ ] ALTER TABLE ... ADD COLUMN ...
    [ ] Ejecutar en Supabase SQL Editor

[ ] Actualizar tipo en src/types/
    [ ] Agregar campo a Interface
    [ ] Agregar a DTO Create (si aplica)
    [ ] Agregar a DTO Update (si aplica)

[ ] Actualizar service en src/services/
    [ ] El service usa el nuevo campo

[ ] Actualizar hook en src/hooks/
    [ ] Si el hook es específico para este campo

[ ] Actualizar componente en src/pages/
    [ ] Formulario puede capturar el nuevo campo
    [ ] Mostrar el nuevo campo en lista
```

---

## 📝 PARTE 8: EJEMPLO COMPLETO (Para IA)

### Tarea: Agregar campo "specialization" a Barber

**Paso 1: Tipo**
```typescript
// src/types/barber.types.ts
export interface Barber {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;  // ← NUEVO
  is_active: boolean;
  created_at: string;
}

export interface CreateBarberData {
  name: string;
  email: string;
  phone: string;
  specialization: string;  // ← NUEVO
}
```

**Paso 2: Migración BD**
```sql
-- supabase/migrations/002_add_specialization.sql
ALTER TABLE barbers ADD COLUMN specialization TEXT;
-- Ejecutar en Supabase SQL Editor
```

**Paso 3: Service**
```typescript
// src/services/barbers.service.ts
export const barbersService = {
  async createBarber(data: CreateBarberData): Promise<Barber> {
    const { data: result, error } = await supabase
      .from('barbers')
      .insert([{
        name: data.name,
        email: data.email,
        phone: data.phone,
        specialization: data.specialization  // ← NUEVO
      }])
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }
};
```

**Paso 4: Hook (sin cambios necesarios, solo usa el service)**

**Paso 5: Componente**
```typescript
// src/pages/dashboard/BarbersPage.tsx
const [specialization, setSpecialization] = useState('');

// En formulario
<Input 
  label="Especialización"
  value={specialization}
  onChange={(e) => setSpecialization(e.target.value)}
/>

// Al crear
const handleCreate = async () => {
  await createBarber({
    name,
    email,
    phone,
    specialization  // ← NUEVO
  });
};

// Al mostrar
{barbers.map(barber => (
  <div key={barber.id}>
    <h3>{barber.name}</h3>
    <p>Especialización: {barber.specialization}</p>
  </div>
))}
```

---

## 🎯 PARTE 9: RESUMEN MENTAL PARA IA

### 9.1 La Pregunta Central que Responde Todo

**"¿Cómo un dato llega de una base de datos a la pantalla del usuario?"**

```
1. BD (PostgreSQL) tiene columna 'specialization' en tabla 'barbers'
2. Service hace: supabase.from('barbers').select('*')
3. Hook llama service: const barbers = await barbersService.getBarbers(id)
4. Hook guarda en estado: setBarbers(barbers)
5. Componente renderiza: {barbers.map(b => <div>{b.specialization}</div>)}
6. Usuario ve: "Cortador especializado en fades"
```

### 9.2 Los 3 Elementos Siempre Presentes

```
TIPO (types/)         ← Define la forma de los datos
  ↓
SERVICE (services/)   ← Obtiene datos de BD
  ↓
HOOK (hooks/)         ← Encapsula lógica React
  ↓
COMPONENTE (pages/)   ← Muestra al usuario
```

### 9.3 Las 4 Operaciones Siempre Iguales

```
READ     → SELECT * FROM table WHERE ...
CREATE   → INSERT INTO table VALUES (...)
UPDATE   → UPDATE table SET ... WHERE id = ...
DELETE   → DELETE FROM table WHERE id = ...
```

### 9.4 Los 3 Niveles de Seguridad

```
AUTENTICACIÓN  → ¿Eres quién dices ser?    (Supabase Auth)
AUTORIZACIÓN   → ¿Puedes hacer esto?      (Roles: owner, admin, staff)
ACCESO FILA    → ¿Puedes ver este dato?   (RLS en BD)
```

---

## 🚀 PARTE 10: GUÍA RÁPIDA PARA IA

### Si necesitas...

| Tarea | Busca en | Patrón |
|------|---------|--------|
| Leer dato de BD | `src/services/` | `.select()` + `throw error` |
| Escribir dato a BD | `src/services/` | `.insert()` o `.update()` |
| Guardar en estado | `src/hooks/` | `useState()` + `setData()` |
| Mostrar dato | `src/pages/` | `{data.map(item => ...)}` |
| Validar entrada | `src/utils/validators.ts` | función que devuelve boolean |
| Proteger ruta | `src/App.tsx` | `<AuthGuard><RequireRole>` |
| Definir tipo | `src/types/` | `interface` o `type` |
| Reutilizar lógica | `src/hooks/` | custom hook `use*` |
| Reutilizar UI | `src/components/common/` | componente `.tsx` |
| Capturar error | `try/catch` en service/hook | `setError()` y mostrar |

---

## 📌 CONCLUSIÓN PARA IA

**Este proyecto sigue patrones consistentes:**

1. **Cada pieza tiene un lugar:** types → services → hooks → components
2. **Cada patrón se repite:** todos los CRUD siguen la misma estructura
3. **Seguridad en capas:** auth → roles → RLS
4. **Flujo unidireccional:** BD → Service → Hook → Componente → UI

**Si entiendes UNA característica (como appointments), entiendes TODAS.**

El 80% de las nuevas features siguen la mismo checklist. Solo cambia el nombre de la tabla y los campos.

---

**Fecha:** Mayo 24, 2026  
**Para:** Agentes IA, Modelos LLM, Copilots locales  
**Confianza:** Alta - Este documento es exhaustivo
