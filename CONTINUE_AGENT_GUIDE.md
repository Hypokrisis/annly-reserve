# 🤖 GUÍA DE CONFIGURACIÓN - AGENTE LOCAL CONTINUE (Ollama qwen2.5-coder:7b)

## ✋ IMPORTANTE
Esta guía es EXCLUSIVAMENTE para el agente Continue ejecutándose localmente en Ollama. Cópiala completa en `.continue/config.py` o en el contexto del agente.

---

# 1️⃣ MAPA DE ARCHIVOS CLAVE

## DESCRIPCIÓN DEL PROYECTO
**Annly Reserve** es una plataforma SaaS de gestión de reservas para barberías (MVP funcional).
- Frontend: React 18 + TypeScript + Vite
- Backend: Supabase (PostgreSQL) + Netlify Functions
- Stack: React Router SPA, TailwindCSS, TypeScript strict
- Estado: Funcional en producción, listo para features avanzadas

## RUTAS ABSOLUTAS CRÍTICAS (Sistema Windows)

### 🎯 PUNTO DE ENTRADA Y CONFIGURACIÓN
```
@C:\Users\loann\annly-reserve\src\App.tsx
  → ARCHIVO CRÍTICO: Define todas las rutas de la aplicación
  → Contiene: Contextos proveedores, Routes, AuthGuard, RequireRole
  → Si necesitas: agregar rutas nuevas, guardar estado global

@C:\Users\loann\annly-reserve\package.json
  → Dependencias: React, TypeScript, Vite, Supabase, date-fns, lucide-react
  → Scripts: "dev", "build", "lint", "typecheck"
  → NO modificar versiones sin testing

@C:\Users\loann\annly-reserve\vite.config.ts
  → Configuración del bundler
  → Path aliases: @/ → src/
  → Puertos: localhost:5173

@C:\Users\loann\annly-reserve\tsconfig.json
  → Configuración TypeScript stricto
  → No desactivar "strict": true sin justificación

@C:\Users\loann\annly-reserve\.env
  → Variables de entorno (NO trackeado en Git)
  → VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (requeridas para ejecutar)
```

### 🔑 AUTENTICACIÓN Y CONTEXTOS GLOBALES
```
@C:\Users\loann\annly-reserve\src\contexts\AuthContext.tsx
  → Maneja: sesión de usuario, login/logout, rol actual
  → Hook: useAuth() → { user, role, signIn(), signOut() }
  → SI MODIFICAS: prueba login/signup después

@C:\Users\loann\annly-reserve\src\contexts\BusinessContext.tsx
  → Maneja: negocio seleccionado, operaciones CRUD
  → Hook: useBusiness() → { business, services, barbers, schedules }
  → SI MODIFICAS: prueba carga de datos después

@C:\Users\loann\annly-reserve\src\supabaseClient.ts
  → Cliente Supabase singleton
  → Inicializa: authentication, database, realtime
  → SI MODIFICAS: asegúrate de tener .env válido
```

### 🎨 COMPONENTES BASE (Reutilizables)
```
@C:\Users\loann\annly-reserve\src\components\common\Button.tsx
@C:\Users\loann\annly-reserve\src\components\common\Input.tsx
@C:\Users\loann\annly-reserve\src\components\common\Modal.tsx
@C:\Users\loann\annly-reserve\src\components\common\Form.tsx
@C:\Users\loann\annly-reserve\src\components\common\Card.tsx
@C:\Users\loann\annly-reserve\src\components\layout\DashboardLayout.tsx
  → Usar SIEMPRE estos en nuevos componentes
  → NO duplicar código de UI
  → TailwindCSS con convenciones del proyecto
```

### 🛠️ SERVICIOS (API LAYER)
```
@C:\Users\loann\annly-reserve\src\services\appointments.service.ts
  → CRUD de citas: crear, actualizar, listar, cancelar
  → Interfaz: createAppointment(), getAppointments(), updateAppointment()
  → Base de datos: tabla "appointments"

@C:\Users\loann\annly-reserve\src\services\availability.service.ts
  → ALGORITMO CRÍTICO: calcula slots disponibles
  → Interfaz: getAvailableSlots(barberId, serviceId, date)
  → Devuelve: array de horarios disponibles (15/30 min intervals)

@C:\Users\loann\annly-reserve\src\services\barbers.service.ts
  → CRUD barberos: crear, editar, activar/desactivar
  → Base de datos: tabla "barbers"

@C:\Users\loann\annly-reserve\src\services\services.service.ts
  → CRUD servicios (haircut, beard, etc)
  → Base de datos: tabla "services"

@C:\Users\loann\annly-reserve\src\services\schedules.service.ts
  → Gestión de horarios semanales
  → Base de datos: tabla "schedules"

@C:\Users\loann\annly-reserve\src\services\business.service.ts
  → Info del negocio, slug, configuración
  → Base de datos: tabla "businesses"

@C:\Users\loann\annly-reserve\src\services\notifications.service.ts
  → Sistema de notificaciones (email, SMS, WhatsApp - preparado)
  → Base de datos: tabla "notifications"

@C:\Users\loann\annly-reserve\src\services\auth.service.ts
  → Autenticación con Supabase
  → Interfaz: signUp(), signIn(), signOut(), resetPassword()
```

### 🎣 CUSTOM HOOKS (Lógica Reutilizable)
```
@C:\Users\loann\annly-reserve\src\hooks\useAppointments.ts
  → Hook: const { appointments, loading, error } = useAppointments(businessId)
  → Usa: appointments.service.ts + useState + useEffect

@C:\Users\loann\annly-reserve\src\hooks\useAvailability.ts
  → Hook: const { slots, loading } = useAvailability(barberId, serviceId, date)
  → Usa: availability.service.ts

@C:\Users\loann\annly-reserve\src\hooks\useBarbers.ts
@C:\Users\loann\annly-reserve\src\hooks\useServices.ts
@C:\Users\loann\annly-reserve\src\hooks\useSchedule.ts
@C:\Users\loann\annly-reserve\src\hooks\usePermissions.ts
  → Hook: const { canEdit, canDelete, canView } = usePermissions(action)
  → Usa: rol del usuario desde AuthContext
```

### 📄 PÁGINAS PRINCIPALES
```
@C:\Users\loann\annly-reserve\src\pages\Home.tsx
  → Landing page pública

@C:\Users\loann\annly-reserve\src\pages\auth\LoginPage.tsx
@C:\Users\loann\annly-reserve\src\pages\auth\SignupPage.tsx
@C:\Users\loann\annly-reserve\src\pages\auth\ForgotPasswordPage.tsx

@C:\Users\loann\annly-reserve\src\pages\public\BookingPage.tsx
  → PÁGINA CRÍTICA: Flujo de reserva pública (5 pasos)
  → Ruta pública: /book/:slug
  → Uso: availability.service.ts, appointments.service.ts

@C:\Users\loann\annly-reserve\src\pages\dashboard\DashboardHome.tsx
@C:\Users\loann\annly-reserve\src\pages\dashboard\ServicesPage.tsx
@C:\Users\loann\annly-reserve\src\pages\dashboard\BarbersPage.tsx
@C:\Users\loann\annly-reserve\src\pages\dashboard\SchedulesPage.tsx
@C:\Users\loann\annly-reserve\src\pages\dashboard\AppointmentsPage.tsx
  → Dashboard protegido (requiere login + rol correcto)
  → Usa: DashboardLayout, contextos, servicios
```

### 📦 TIPOS TYPESCRIPT
```
@C:\Users\loann\annly-reserve\src\types\user.types.ts
  → interface User, type UserRole, interface UserBusiness

@C:\Users\loann\annly-reserve\src\types\business.types.ts
  → interface Business, interface CreateBusinessData

@C:\Users\loann\annly-reserve\src\types\appointment.types.ts
  → interface Appointment, type AppointmentStatus, interface AppointmentFilters

@C:\Users\loann\annly-reserve\src\types\service.types.ts
@C:\Users\loann\annly-reserve\src\types\barber.types.ts
@C:\Users\loann\annly-reserve\src\types\schedule.types.ts

⚠️ REGLA: Siempre importar tipos, NO usar 'any'
```

### 🗄️ BASE DE DATOS
```
@C:\Users\loann\annly-reserve\supabase\migrations\001_initial_schema.sql
  → Script de creación de 8 tablas
  → RLS policies incluidas
  → SI NECESITAS: agregar columna, editar acá y ejecutar en Supabase

Tablas en Supabase:
  - businesses, users_businesses, barbers, services, barbers_services
  - schedules, appointments, notifications
```

### 🔧 CONFIGURACIÓN PWA
```
@C:\Users\loann\annly-reserve\public\manifest.json
  → Web App Manifest (Progressive Web App)

@C:\Users\loann\annly-reserve\public\service-worker.js
  → Service Worker (cache, offline support)
```

### 📋 ARCHIVOS DE CONFIGURACIÓN Y DOCUMENTACIÓN
```
@C:\Users\loann\annly-reserve\QUICKSTART.md
  → Comandos para ejecutar localmente

@C:\Users\loann\annly-reserve\DEPLOYMENT.md
  → Guía paso a paso para deploy

@C:\Users\loann\annly-reserve\PROJECT_SUMMARY.md
  → Resumen técnico del proyecto

@C:\Users\loann\annly-reserve\LEARNING_ROADMAP.md
  → Rutas de aprendizaje necesarias
```

---

# 2️⃣ PRIMERA ORDEN DE ACCIÓN (PRUEBA DE CONEXIÓN)

## INSTRUCCIÓN AL AGENTE CONTINUE
```
/edit @C:\Users\loann\annly-reserve\src\App.tsx

CAMBIO SOLICITADO:
Después de la línea que importa los contextos (alrededor de la línea 12-15),
agrega un comentario de confirma la conexión exitosa del agente.

INSTRUCCIÓN ESPECÍFICA:
1. Busca la línea: "import { ThemeProvider } from '@/contexts/ThemeContext';"
2. Después de esa línea, agrega:
   // ✅ AGENTE CONTINUE CONECTADO - Acceso confirmado al codebase
3. Guarda el archivo

VALIDACIÓN:
El agente debe:
- Encontrar la ruta exacta
- Hacer el cambio sin inventar líneas
- No eliminar código existente
- Reportar: "✅ CAMBIO COMPLETADO: Comentario agregado en línea X"
```

---

# 3️⃣ REGLAS DE EJECUCIÓN ESTRICTAS

## REGLA #1: NO INVENTAR RUTAS
```
❌ PROHIBIDO: Asumir que existe @C:\Users\loann\annly-reserve\src\components\NewComponent.tsx
              sin que el usuario lo haya creado

✅ OBLIGATORIO: Si no sabes dónde está algo, usa:
              @codebase [búsqueda general del código]
              
              Ejemplo: "@codebase dónde se define UserRole"
              → Encuentra automáticamente el archivo correcto
              
              O pregunta directamente:
              "¿Cuál es la ruta exacta del componente X?"
```

## REGLA #2: USO DE @codebase PARA BÚSQUEDAS
```
SINTAXIS:
@codebase [descripción en lenguaje natural]

EJEMPLOS CORRECTOS:
- @codebase dónde se valida un email
- @codebase todas las funciones que crean citas
- @codebase qué servicios utiliza BookingPage
- @codebase dónde están los tipos de Appointment
- @codebase búscame la función que calcula disponibilidad

EL AGENTE DEBE:
1. Usar @codebase como herramienta de búsqueda
2. No asumir ubicaciones
3. Leer el resultado antes de editar
4. Mencionar las rutas encontradas en su respuesta
```

## REGLA #3: EJECUTAR HERRAMIENTAS DIRECTAMENTE - SIN PREGUNTAR
```
COMPORTAMIENTO CORRECTO:
Usuario: "Modifica el componente Button para agregar una clase 'error'"
Agente: 
  1. Busca @codebase dónde está Button
  2. Lee el archivo @src\components\common\Button.tsx
  3. EJECUTA DIRECTAMENTE el cambio sin pedir confirmación
  4. Reporta: "✅ HECHO: Button.tsx modificado en línea X"

COMPORTAMIENTO INCORRECTO:
Usuario: "Modifica el componente Button..."
Agente: "¿Quieres que agregue la clase 'error'? ¿En cuál div? ¿Quieres confirmación?"
❌ ESTO FRENA EL DESARROLLO

PRINCIPIO:
- El agente es AUTÓNOMO
- Usa el contexto del usuario para DEDUCIR intención
- EJECUTA cambios sensatos sin bloqueos
- Reporta qué hizo después (no antes)
```

---

## 🎯 RESUMEN RÁPIDO PARA EL AGENTE

| Concepto | Dónde encontrarlo | Qué hacer |
|----------|-------------------|-----------|
| Rutas de la app | @src/App.tsx | Agregar rutas nuevas aquí |
| Auth y sesión | @src/contexts/AuthContext.tsx | Acceder con useAuth() |
| Negocio actual | @src/contexts/BusinessContext.tsx | Acceder con useBusiness() |
| Crear cita | @src/services/appointments.service.ts | createAppointment(data) |
| Slots disponibles | @src/services/availability.service.ts | getAvailableSlots(params) |
| Componente UI | @src/components/common/* | Reutilizar, NO duplicar |
| Tipos | @src/types/*.ts | Siempre tipado, NO any |
| Base de datos | @supabase/migrations/001_initial_schema.sql | Estructura de 8 tablas |
| Páginas protegidas | @src/pages/dashboard/* | Requieren AuthGuard |
| Páginas públicas | @src/pages/public/* | SIN protección |

---

## 📌 TABLA DE REFERENCIA: ARCHIVOS CRÍTICOS

```
ARCHIVO                                           PROPÓSITO                      MODIFICAR SI
===============================================================================================
src/App.tsx                                      Rutas y contextos              ✅ Nueva ruta, nuevo provider
src/contexts/AuthContext.tsx                     Auth global                    ✅ Cambiar lógica de sesión
src/contexts/BusinessContext.tsx                 Estado del negocio             ✅ Agregar estado global
src/services/appointments.service.ts             CRUD citas                     ✅ Nueva validación o query
src/services/availability.service.ts             Algoritmo disponibilidad       ⚠️  Solo si cambias lógica core
src/pages/public/BookingPage.tsx                 Flujo de reserva pública       ✅ Cambiar pasos o validación
src/components/common/*                          UI base reutilizable           ✅ Agregar variantes, props
src/types/*.ts                                   Tipos TypeScript               ✅ Agregar campos a interfaces
src/hooks/use*.ts                                Lógica reutilizable            ✅ Nuevo hook personalizado
package.json                                     Dependencias                   ⚠️  Solo agregar si es necesario
vite.config.ts                                   Bundler                        ⚠️  Evitar cambios
tsconfig.json                                    TypeScript stricto             ⚠️  NO desactivar strict mode
supabase/.../001_initial_schema.sql              Estructura BD                  ⚠️  Coordinar con admin
```

---

## 🚨 ERRORES COMUNES A EVITAR

```
❌ ERROR: "No encontré la función X"
   ✅ SOLUCIÓN: Usa @codebase función X

❌ ERROR: "Asumir que existe src/components/MiComponente.tsx"
   ✅ SOLUCIÓN: Primero verifica que exista o créalo antes de importar

❌ ERROR: "No encontré la variable en el scope"
   ✅ SOLUCIÓN: Verifica que estés en un componente que use el contexto
              ejemplo: useAuth() solo funciona dentro de <AuthProvider>

❌ ERROR: "El cambio se compiló pero no se ve"
   ✅ SOLUCIÓN: Recarga la página (Ctrl+Shift+R hard refresh)
              O si es server-side: reinicia npm run dev

❌ ERROR: "Cambio compila pero da error en runtime"
   ✅ SOLUCIÓN: Abre DevTools (F12) → Console → lee el error rojo
              Reporta el error exacto al usuario
```

---

## ✨ COMANDOS AL AGENTE

El agente CONTINUE debe entender estos comandos directos:

```bash
/edit @ruta/archivo.tsx
→ Abre y edita un archivo específico

/create @ruta/archivo.tsx
→ Crea un nuevo archivo (NO si ya existe)

/search @codebase [término]
→ Busca en todo el codebase

/read @ruta/archivo.tsx
→ Lee el contenido de un archivo

/test
→ Ejecuta npm run typecheck para validar tipos

/run @codebase componentes que usen Supabase
→ Busca y lista componentes que usan Supabase
```

---

## 🎓 PRÓXIMOS PASOS PARA EL AGENTE

Después de validar la conexión con el comentario en App.tsx:

1. **Exploración:** Lee @codebase describiendo la estructura
2. **Mapeo:** Entiende las 4 capas: Componentes → Hooks → Services → Supabase
3. **Práctica:** Pequeños cambios en componentes (agregar props, clase CSS)
4. **Iteración:** Cambios en servicios (nueva query a Supabase)
5. **Autonomía:** Implementar features completos sin supervisión

---

**Fecha de creación:** Mayo 24, 2026  
**Proyecto:** Annly Reserve MVP  
**Agente:** Continue (Local Ollama qwen2.5-coder:7b)  
**Estado:** Listo para desarrollo autónomo
