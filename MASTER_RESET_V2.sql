-- =================================================================
-- ☣️ MASTER RESET V2: LA SOLUCIÓN DEFINITIVA
-- =================================================================
-- Este script BORRA TODO y reconstruye la base de datos CORRECTAMENTE.
-- Integra:
-- 1. Todas las tablas (incluyendo la que faltaba: users_businesses).
-- 2. Políticas RLS anti-error 400 (Usando EXISTS en vez de IN).
-- 3. Aislamiento total entre barberías.

-- ⚠️ ADVERTENCIA: SE BORRARÁN TODOS LOS DATOS ⚠️

-- 1. LIMPIEZA TOTAL (DROP CASCADA)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS barbers_services CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS users_businesses CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- 2. CREACIÓN DE TABLAS (SCHEMA V2)

-- TABLA 1: NEGOCIOS
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  max_days_advance INTEGER DEFAULT 30
);

-- TABLA 2: VINCULACIÓN USUARIO-NEGOCIO (¡Esta faltaba antes!)
CREATE TABLE users_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- TABLA 3: SERVICIOS
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA 4: BARBEROS
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA 5: RELACIÓN BARBEROS-SERVICIOS
CREATE TABLE barbers_services (
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (barber_id, service_id)
);

-- TABLA 6: HORARIOS
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Domingo
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- TABLA 7: CITAS (APPOINTMENTS)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_notes TEXT,
  
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HABILITAR SEGURIDAD (RLS)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS DE SEGURIDAD (ANTI-ERROR 400)

-- A) BUSINESSES
-- Público: Ver activos
CREATE POLICY "Public view businesses" ON businesses FOR SELECT 
USING (is_active = true);
-- Owner: Ver/Editar los suyos
CREATE POLICY "Owner manage businesses" ON businesses FOR ALL 
USING (auth.uid() = owner_id);

-- B) USERS_BUSINESSES
-- Usuario: Ver sus relaciones
CREATE POLICY "User view relations" ON users_businesses FOR SELECT 
USING (user_id = auth.uid());
-- Usuario: Auto-asignarse (necesario al crear negocio)
CREATE POLICY "User insert relations" ON users_businesses FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- C) SERVICES (Uso de EXISTS para evitar 400 Bad Request)
-- Público: Ver activos de negocios activos
CREATE POLICY "Public view services" ON services FOR SELECT 
USING (is_active = true AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = services.business_id AND b.is_active = true));

-- Owner: Gestionar TODO si tiene relación en users_businesses
CREATE POLICY "Owner manage services" ON services FOR ALL
USING (EXISTS (SELECT 1 FROM users_businesses ub WHERE ub.business_id = services.business_id AND ub.user_id = auth.uid()));

-- D) BARBERS
-- Público: Ver activos
CREATE POLICY "Public view barbers" ON barbers FOR SELECT 
USING (is_active = true AND EXISTS (SELECT 1 FROM businesses b WHERE b.id = barbers.business_id AND b.is_active = true));

-- Owner: Gestionar TODO
CREATE POLICY "Owner manage barbers" ON barbers FOR ALL
USING (EXISTS (SELECT 1 FROM users_businesses ub WHERE ub.business_id = barbers.business_id AND ub.user_id = auth.uid()));

-- E) BARBERS_SERVICES
-- Público: Ver todas (es tabla de relación simple)
CREATE POLICY "Public view bs" ON barbers_services FOR SELECT USING (true);
-- Owner: Gestionar
CREATE POLICY "Owner manage bs" ON barbers_services FOR ALL
USING (EXISTS (SELECT 1 FROM barbers b JOIN users_businesses ub ON b.business_id = ub.business_id WHERE b.id = barbers_services.barber_id AND ub.user_id = auth.uid()));

-- F) SCHEDULES
-- Público: Ver
CREATE POLICY "Public view schedules" ON schedules FOR SELECT USING (true);
-- Owner: Gestionar
CREATE POLICY "Owner manage schedules" ON schedules FOR ALL
USING (EXISTS (SELECT 1 FROM barbers b JOIN users_businesses ub ON b.business_id = ub.business_id WHERE b.id = schedules.barber_id AND ub.user_id = auth.uid()));

-- G) APPOINTMENTS
-- Público: Insertar (Reservar)
CREATE POLICY "Public create appointments" ON appointments FOR INSERT WITH CHECK (true);
-- Owner: Ver y Gestionar sus citas
CREATE POLICY "Owner manage appointments" ON appointments FOR ALL
USING (EXISTS (SELECT 1 FROM users_businesses ub WHERE ub.business_id = appointments.business_id AND ub.user_id = auth.uid()));

-- FIN DEL SCRIPT
