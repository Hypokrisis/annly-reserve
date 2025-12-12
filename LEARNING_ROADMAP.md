# Ruta de Aprendizaje: De Principiante a Full Stack (Stack Annly Reserve)

Este documento detalla qué necesitas estudiar para entender y construir proyectos como este desde cero, sin depender de la IA.

## 1. Los Fundamentos (La Base)
Antes de React, necesitas dominar el lenguaje del navegador.
*   **HTML5:** Semántica, formularios, estructura del DOM.
*   **CSS3:** Flexbox, Grid, Responsive Design (Media Queries).
*   **JavaScript (ES6+):**
    *   Variables (`let`, `const`).
    *   Funciones flecha (`=>`).
    *   Promesas y `async/await` (CRUCIAL para entender por qué tu página "espera" datos).
    *   Manipulación de Arrays (`.map`, `.filter`, `.reduce`).
    *   Módulos (`import`/`export`).

**⏱️ Tiempo estimado:** 1 - 2 meses.

## 2. El Frontend Moderno (React + TypeScript)
Aquí es donde vive tu aplicación.
*   **React:**
    *   **Componentes:** Pensar en piezas de LEGO (Botones, Tarjetas, Formularios).
    *   **Hooks:** `useState` (memoria del componente) y `useEffect` (efectos secundarios, como cargar datos).
    *   **React Router:** Navegación sin recargar la página (SPA).
*   **TypeScript:**
    *   Es JavaScript con "tipos". Te obliga a definir qué es un "Usuario" o una "Cita" para que no cometas errores tontos.
    *   Interfaces y Tipos (`interface Business {...}`).

**⏱️ Tiempo estimado:** 2 - 3 meses.

## 3. El Backend y Datos (Supabase)
Cómo guardar y proteger la información.
*   **Bases de Datos Relacionales (SQL):** Entender tablas, filas, columnas y relaciones (Foreign Keys).
*   **Supabase (BaaS):**
    *   Autenticación (Login/Signup).
    *   Consultas (`select`, `insert`, `update`).
    *   **RLS (Row Level Security):** La parte más difícil pero importante. Seguridad: "¿Quién puede ver qué?".

**⏱️ Tiempo estimado:** 1 - 2 meses.

## 4. Herramientas y Despliegue (DevOps Básico)
Cómo llevar tu código al mundo.
*   **Git & GitHub:** Guardar versiones de tu código (commits, branches, push/pull).
*   **Vite:** El empaquetador que hace que tu entorno de desarrollo sea rápido.
*   **Netlify / Vercel:** Entender qué es un "Build", variables de entorno (`.env`) y CI/CD (despliegue automático).

**⏱️ Tiempo estimado:** 1 mes (se aprende haciendo).

## 5. El Arte del Debugging (Cómo resolver problemas sin IA)
Esto es lo que diferencia a un junior de un senior. No es memorizar código, es saber investigar.

### Herramientas Clave:
1.  **Chrome DevTools (F12):**
    *   **Console:** Para ver `console.log` y errores rojos.
    *   **Network Tab (Red):** **LA MÁS IMPORTANTE.** Aquí ves si una petición salió, si falló (404, 500), o si se quedó colgada (Pending). Si hubieras sabido usar esta pestaña hoy, habrías visto el "Pending" de 10 segundos tú mismo.
    *   **Application Tab:** Para ver LocalStorage, Cookies y Caché.

### La Mentalidad de Debugging:
1.  **Aislar el problema:** "¿Falla en todos lados o solo en esta página?".
2.  **Leer el error:** No te asustes por el texto rojo. Lee lo que dice. A veces dice exactamente qué falta (ej: "Missing environment variable").
3.  **Dividir y vencer:** Si algo grande falla, comenta la mitad del código. ¿Sigue fallando? Entonces el error está en la otra mitad.

---

## Resumen Total
*   **Dedicación completa (Full-time):** 4 - 6 meses.
*   **Dedicación parcial (Part-time):** 8 - 12 meses.

**Consejo de Oro:** No intentes aprenderlo todo de golpe. Construye cosas pequeñas. Rompe cosas. Arréglalas. Es la única forma.
