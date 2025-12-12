-- =================================================================
-- 🚨 SCRIPT DE REINICIO TOTAL Y CORRECCIÓN DE SEGURIDAD (FINAL)
-- =================================================================
-- Este script BORRARÁ todos los datos y regenerará la estructura
-- asegurando el acceso correcto para Dueños (Dashboard) y Clientes (Página Pública).

-- 1. LIMPIEZA PROFUNDA (Borrar todo en orden correcto)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS barbers_services CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS barbers CASCADE;
DROP TABLE IF EXISTS users_businesses CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;

-- 2. CREACIÓN DE TABLAS (Estructura Limpia)

-- Negocios (La Barbería)
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL, -- Ej: 'annlobarberia'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  -- Configuración simple
  max_days_advance INTEGER DEFAULT 30
);

-- Servicios (Corte, Barba, etc.)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barberos (Empleados)
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255), 
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación Barbero-Servicio (Qué hace cada uno)
CREATE TABLE barbers_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(barber_id, service_id)
);

-- Horarios (Disponibilidad)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Domingo, 1=Lunes...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Citas (Reservas)
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  -- Datos del Cliente (Público)
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  
  -- Datos de la Cita
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SEGURIDAD (RLS) - Aquí estaba el problema anterior
-- Activamos seguridad en todas las tablas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- === POLÍTICAS DE NEGOCIOS ===
-- Público: Puede VER si el negocio está activo (Para cargar la página de reserva)
CREATE POLICY "Public can view active businesses" ON businesses
  FOR SELECT USING (is_active = true);

-- Dueño: Puede hacer TODO en su negocio
CREATE POLICY "Owner everything on businesses" ON businesses
  FOR ALL USING (auth.uid() = owner_id);

-- === POLÍTICAS DE SERVICIOS Y BARBEROS ===
-- Público: Puede VER servicios activos (Para reservar)
CREATE POLICY "Public view services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Public view barbers" ON barbers FOR SELECT USING (is_active = true);
CREATE POLICY "Public view barber_services" ON barbers_services FOR SELECT USING (true);
CREATE POLICY "Public view schedules" ON schedules FOR SELECT USING (true);

-- Dueño: Puede GESTIONAR sus servicios y barberos
-- Usamos una subconsulta simple: "¿Es este servicio de un negocio mío?"
CREATE POLICY "Owner manage services" ON services 
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owner manage barbers" ON barbers 
  FOR ALL USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owner manage barber_services" ON barbers_services 
  FOR ALL USING (barber_id IN (SELECT id FROM barbers WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

CREATE POLICY "Owner manage schedules" ON schedules 
  FOR ALL USING (barber_id IN (SELECT id FROM barbers WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())));

-- === POLÍTICAS DE CITAS (Lo más crítico) ===
-- Público: Puede CREAR citas (Insertar)
CREATE POLICY "Public create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

-- Público: NO puede ver citas de otros (Privacidad)
-- Excepto para verificar disponibilidad (normalmente se hace por código o funcion RPC, pero para simplificar, permitimos ver fechas ocupadas anonimamente si fuera necesario, aunque aquí bloquearemos lectura publica directa para max seguridad. La disponibilidad se calculará intentando reservar o via función).

-- Dueño: Puede VER todas las citas de su negocio (Dashboard)
CREATE POLICY "Owner view appointments" ON appointments
  FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

-- Dueño: Puede MODIFICAR citas (Cancelar, etc)
CREATE POLICY "Owner manage appointments" ON appointments
  FOR UPDATE USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
