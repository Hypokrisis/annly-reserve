-- =================================================================
-- ☢️ BORRADO DEFINITIVO DE USUARIO (Auth)
-- =================================================================
-- Corre este script para borrar tu email de la base de datos de usuarios.
-- Esto te permitirá registrarte de nuevo como si fuera la primera vez.

DELETE FROM auth.users 
WHERE email = 'loann.santiago@gmail.com';

-- Si no sale error, significa que se borró (o ya no existía).
