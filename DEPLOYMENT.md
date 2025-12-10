# 🚀 Guía de Deployment - Annly Reserve

## Paso 1: Configurar Supabase (Base de Datos)

### 1.1 Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Click en **"New Project"**
4. Completa:
   - **Name:** annly-reserve
   - **Database Password:** (genera una contraseña segura y guárdala)
   - **Region:** Selecciona la más cercana a República Dominicana (ej: us-east-1)
5. Click **"Create new project"**
6. Espera 2-3 minutos mientras se crea

### 1.2 Ejecutar el Script de Base de Datos

1. En tu proyecto de Supabase, ve a **SQL Editor** (menú izquierdo)
2. Click en **"New Query"**
3. Abre el archivo `supabase/migrations/001_initial_schema.sql` de tu proyecto
4. Copia TODO el contenido del archivo
5. Pégalo en el SQL Editor de Supabase
6. Click en **"Run"** (botón verde abajo a la derecha)
7. Deberías ver: "Success. No rows returned"

### 1.3 Verificar que las Tablas se Crearon

1. Ve a **Table Editor** en el menú izquierdo
2. Deberías ver 8 tablas:
   - businesses
   - users_businesses
   - barbers
   - services
   - barbers_services
   - schedules
   - appointments
   - notifications

### 1.4 Obtener las Credenciales de API

1. Ve a **Settings** → **API** (menú izquierdo)
2. Copia estos dos valores:
   - **Project URL** (ejemplo: `https://xxxxx.supabase.co`)
   - **anon public** key (es una clave larga que empieza con `eyJ...`)

---

## Paso 2: Configurar Variables de Entorno Localmente

### 2.1 Crear archivo .env

1. En la raíz de tu proyecto, crea un archivo llamado `.env`
2. Agrega estas líneas (reemplaza con tus valores de Supabase):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

3. Guarda el archivo

### 2.2 Verificar que .env está en .gitignore

Abre `.gitignore` y asegúrate de que incluye:
```
.env
.env.local
```

---

## Paso 3: Probar Localmente

### 3.1 Instalar Dependencias

```bash
npm install
```

### 3.2 Ejecutar en Desarrollo

```bash
npm run dev
```

### 3.3 Probar el Flujo Completo

1. Abre `http://localhost:5173`
2. Ve a `/signup`
3. Crea una cuenta:
   - Email: tu@email.com
   - Contraseña: mínimo 6 caracteres
   - Nombre del negocio: Mi Barbería
   - Slug: mi-barberia
4. Deberías ser redirigido a `/dashboard`
5. Prueba crear:
   - Un servicio (ej: Corte de pelo, 30 min, $500)
   - Un barbero (asígnale el servicio)
   - Horarios para el barbero

---

## Paso 4: Preparar para Netlify

### 4.1 Verificar netlify.toml

Tu archivo `netlify.toml` debe contener:

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4.2 Build Local (Opcional - para verificar)

```bash
npm run build
```

Si hay errores, corrígelos antes de continuar.

---

## Paso 5: Deploy a Netlify

### Opción A: Deploy desde GitHub (Recomendado)

#### 5.1 Subir a GitHub

1. Crea un repositorio en GitHub (si no lo tienes)
2. En tu terminal:

```bash
git init
git add .
git commit -m "Initial commit - Annly Reserve MVP"
git branch -M main
git remote add origin https://github.com/tu-usuario/annly-reserve.git
git push -u origin main
```

#### 5.2 Conectar con Netlify

1. Ve a [https://app.netlify.com](https://app.netlify.com)
2. Inicia sesión o crea una cuenta
3. Click en **"Add new site"** → **"Import an existing project"**
4. Selecciona **"GitHub"**
5. Autoriza Netlify a acceder a tus repos
6. Selecciona tu repositorio `annly-reserve`
7. Configuración:
   - **Branch to deploy:** main
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
8. Click en **"Show advanced"** → **"New variable"**
9. Agrega las variables de entorno:
   - `VITE_SUPABASE_URL` = tu URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu anon key de Supabase
10. Click **"Deploy site"**

#### 5.3 Esperar el Deploy

- Netlify comenzará a construir tu sitio
- Toma 2-5 minutos
- Verás el progreso en tiempo real
- Cuando termine, verás "Published"

### Opción B: Deploy Manual (Drag & Drop)

1. Ejecuta `npm run build` localmente
2. Ve a [https://app.netlify.com](https://app.netlify.com)
3. Arrastra la carpeta `dist` a Netlify
4. Ve a **Site settings** → **Environment variables**
5. Agrega las variables de Supabase
6. Redeploy el sitio

---

## Paso 6: Configurar el Dominio

### 6.1 Obtener la URL de Netlify

Netlify te asignará una URL como:
`https://random-name-123456.netlify.app`

### 6.2 Cambiar el Nombre del Sitio (Opcional)

1. En Netlify, ve a **Site settings** → **Site details**
2. Click en **"Change site name"**
3. Elige un nombre: `annly-reserve` (si está disponible)
4. Tu URL será: `https://annly-reserve.netlify.app`

### 6.3 Dominio Personalizado (Opcional)

Si tienes un dominio propio:
1. Ve a **Domain settings** → **Add custom domain**
2. Sigue las instrucciones para configurar DNS
3. Netlify te dará SSL gratis

---

## Paso 7: Probar en Producción

### 7.1 Crear una Cuenta de Prueba

1. Ve a tu sitio en Netlify: `https://tu-sitio.netlify.app`
2. Click en **"Signup"**
3. Crea una cuenta de prueba
4. Verifica que llegues al dashboard

### 7.2 Configurar el Negocio

1. Ve a **Dashboard** → **Servicios**
2. Crea al menos 2 servicios:
   - Corte de pelo (30 min, $500)
   - Barba (20 min, $300)
3. Ve a **Barberos**
4. Crea al menos 1 barbero y asígnale los servicios
5. Ve a **Horarios**
6. Configura el horario del barbero (ej: Lunes a Sábado, 9:00 AM - 6:00 PM)

### 7.3 Probar la Reserva Pública

1. Abre una ventana de incógnito
2. Ve a: `https://tu-sitio.netlify.app/book/tu-slug`
   - Reemplaza `tu-slug` con el slug que usaste al crear el negocio
3. Completa el flujo de reserva:
   - Selecciona servicio
   - Selecciona barbero
   - Selecciona fecha (hoy o mañana)
   - Deberías ver horarios disponibles
   - Ingresa datos del cliente
   - Confirma
4. Verifica que la cita aparezca en el dashboard

---

## Paso 8: Configuración Adicional

### 8.1 Configurar Supabase Auth (Email)

Para que funcionen los emails de Supabase:

1. En Supabase, ve a **Authentication** → **Email Templates**
2. Personaliza los templates si quieres
3. Ve a **Settings** → **Auth**
4. Configura:
   - **Site URL:** `https://tu-sitio.netlify.app`
   - **Redirect URLs:** Agrega `https://tu-sitio.netlify.app/**`

### 8.2 Habilitar Row Level Security (Ya está)

Las políticas RLS ya están configuradas en el script SQL, pero verifica:
1. Ve a **Authentication** → **Policies**
2. Deberías ver políticas para cada tabla
3. Si no las ves, vuelve a ejecutar el script SQL

---

## 🎯 Checklist Final

Antes de considerar el deploy completo, verifica:

- [ ] Base de datos creada en Supabase
- [ ] 8 tablas creadas correctamente
- [ ] Variables de entorno configuradas en Netlify
- [ ] Sitio desplegado y accesible
- [ ] Puedes crear una cuenta
- [ ] Puedes crear servicios
- [ ] Puedes crear barberos
- [ ] Puedes configurar horarios
- [ ] La página pública de reservas funciona (`/book/slug`)
- [ ] Puedes hacer una reserva de prueba
- [ ] La cita aparece en el dashboard

---

## 🐛 Solución de Problemas

### Error: "Missing Supabase credentials"
- Verifica que las variables de entorno estén en Netlify
- Asegúrate de que empiecen con `VITE_`
- Redeploy el sitio después de agregar variables

### Error: "Business not found" en /book/slug
- Verifica que el slug sea correcto
- Revisa en Supabase → Table Editor → businesses
- El slug debe coincidir exactamente

### No aparecen horarios disponibles
- Verifica que el barbero tenga horarios configurados
- Verifica que el barbero esté activo
- Verifica que el barbero tenga asignado el servicio seleccionado
- Revisa la consola del navegador para errores

### Las citas no se crean
- Abre la consola del navegador (F12)
- Revisa errores en la pestaña Console
- Verifica las políticas RLS en Supabase
- Asegúrate de que el servicio y barbero existan

---

## 📱 Próximos Pasos (Opcional)

### PWA (Progressive Web App)

1. Genera los iconos de la app (usa [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator))
2. Coloca los iconos en `public/icons/`
3. Agrega las meta tags a `index.html`
4. Registra el service worker en `main.tsx`
5. Redeploy

### Notificaciones por Email

1. Crea cuenta en [SendGrid](https://sendgrid.com) o [Resend](https://resend.com)
2. Obtén tu API key
3. Crea una Netlify Function para enviar emails
4. Actualiza `notifications.service.ts` para llamar a la función
5. Agrega la API key a las variables de entorno de Netlify

---

## 🎉 ¡Listo!

Tu aplicación Annly Reserve está ahora en producción. Los clientes pueden:
- Visitar `/book/tu-slug`
- Ver servicios disponibles
- Seleccionar barbero y fecha
- Ver solo horarios reales disponibles
- Reservar su cita

Y tú puedes:
- Gestionar servicios, barberos y horarios
- Ver todas las citas del día
- Marcar citas como completadas
- Cancelar o reprogramar

**URL de tu negocio para compartir:**
`https://tu-sitio.netlify.app/book/tu-slug`
