-- =================================================================
-- 🚀 CREACIÓN MANUAL DE NEGOCIO (Rescate)
-- =================================================================
-- Como ya tienes cuenta pero borramos tu negocio, la web no te deja crear otro.
-- Este script crea uno nuevo "a la fuerza" y te lo asigna.

-- 1. Insertar el Negocio (Puedes cambiar el nombre aquí si quieres)
WITH new_business AS (
  INSERT INTO businesses (owner_id, name, slug, is_active)
  VALUES (
    auth.uid(),                   -- Tu ID de usuario
    'Mi Nueva Barbería',          -- NOMBRE (Cámbialo si quieres)
    'nueva-barberia-' || substr(md5(random()::text), 1, 4), -- SLUG ÚNICO (Para evitar errores)
    true
  )
  RETURNING id
)

-- 2. Conectarte como Dueño
INSERT INTO users_businesses (user_id, business_id, role)
SELECT auth.uid(), id, 'owner'
FROM new_business;

-- ¡LISTO! Ahora recarga la página web.
