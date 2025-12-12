-- =================================================================
-- 🚨 EMERGENCIA: Tabla users_businesses FALTANTE
-- =================================================================
-- El script anterior borró esta tabla pero olvidó crearla.
-- Esto causa el error 404 en el Dashboard.

-- 1. Crear la tabla que falta
CREATE TABLE IF NOT EXISTS users_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, business_id)
);

-- 2. Activar Seguridad
ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso (RLS)
-- El usuario puede ver sus propias relaciones
CREATE POLICY "Users can view own relations" ON users_businesses
  FOR SELECT USING (user_id = auth.uid());

-- El sistema (o triggers) puede insertar, pero por ahora permitimos al usuario 
-- auto-asociarse si crea el negocio (lógica simplificada) o si es owner
CREATE POLICY "Users can insert own relations" ON users_businesses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Permitir borrar si eres el usuario
CREATE POLICY "Users can delete own relations" ON users_businesses
  FOR DELETE USING (user_id = auth.uid());

-- 4. AUTORREPARACIÓN: Insertar relación para negocios existentes que quedaron huérfanos
-- Si ya creaste un negocio y eres el dueño, creamos la relación automáticamente ahora mismo.
INSERT INTO users_businesses (user_id, business_id, role)
SELECT owner_id, id, 'owner'
FROM businesses
WHERE owner_id = auth.uid()
ON CONFLICT DO NOTHING;
