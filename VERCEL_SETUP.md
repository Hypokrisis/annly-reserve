# Guía de Configuración Rápida en Vercel

Si tu página se ve en blanco o dice "Not Found", es porque faltan las **Variables de Entorno**. Vercel necesita saber la dirección de tu base de datos (Supabase).

Sigue estos 3 pasos exactos:

## Paso 1: Copia tus claves
1. En este editor (VS Code), busca el archivo llamado `.env` (está en la lista de archivos a la izquierda, abajo del todo).
2. Ábrelo y verás algo como esto:
   ```
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
3. Mantén ese archivo abierto, lo necesitarás.

## Paso 2: Configura Vercel
1. Ve a tu proyecto en [vercel.com](https://vercel.com/dashboard).
2. Haz clic en la pestaña **Settings** (Configuración) en la parte superior.
3. En el menú de la izquierda, haz clic en **Environment Variables**.

## Paso 3: Añade las claves
Tienes que añadir las dos claves una por una:

**Clave 1:**
*   **Key:** `VITE_SUPABASE_URL`
*   **Value:** (Copia el valor de tu archivo .env que empieza por `https://`)
*   Haz clic en **Save**.

**Clave 2:**
*   **Key:** `VITE_SUPABASE_ANON_KEY`
*   **Value:** (Copia el valor largo de tu archivo .env)
*   Haz clic en **Save**.

## Paso Final: Redeploy
Para que los cambios funcionen, necesitas volver a desplegar:
1. Ve a la pestaña **Deployments** (arriba).
2. Haz clic en los 3 puntitos (...) del último deploy (el de arriba del todo).
3. Dale a **Redeploy**.
4. Espera a que termine (se pondrá verde).

¡Listo! Ahora entra a tu página y debería funcionar perfectamente.
