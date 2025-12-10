-- Annly Reserve Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: businesses
-- =====================================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  logo_url TEXT,
  
  -- Configuration
  booking_buffer_minutes INTEGER DEFAULT 0,
  cancellation_window_hours INTEGER DEFAULT 24,
  max_advance_booking_days INTEGER DEFAULT 30,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_owner ON businesses(owner_id);

-- =====================================================
-- TABLE: users_businesses
-- =====================================================
CREATE TABLE users_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_users_businesses_user ON users_businesses(user_id);
CREATE INDEX idx_users_businesses_business ON users_businesses(business_id);

-- =====================================================
-- TABLE: barbers
-- =====================================================
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,
  bio TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_barbers_business ON barbers(business_id);
CREATE INDEX idx_barbers_user ON barbers(user_id);

-- =====================================================
-- TABLE: services
-- =====================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_business ON services(business_id);

-- =====================================================
-- TABLE: barbers_services
-- =====================================================
CREATE TABLE barbers_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barber_id, service_id)
);

CREATE INDEX idx_barbers_services_barber ON barbers_services(barber_id);
CREATE INDEX idx_barbers_services_service ON barbers_services(service_id);

-- =====================================================
-- TABLE: schedules
-- =====================================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(barber_id, day_of_week)
);

CREATE INDEX idx_schedules_barber ON schedules(barber_id);

-- =====================================================
-- TABLE: appointments
-- =====================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  
  -- Customer information
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_notes TEXT,
  
  -- Appointment information
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE INDEX idx_appointments_business ON appointments(business_id);
CREATE INDEX idx_appointments_barber ON appointments(barber_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_customer_email ON appointments(customer_email);
CREATE INDEX idx_appointments_barber_date_time ON appointments(barber_id, appointment_date, start_time, end_time);

-- =====================================================
-- TABLE: notifications
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX idx_notifications_appointment ON notifications(appointment_id);
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for businesses
CREATE POLICY "Users can view their own businesses" ON businesses
  FOR SELECT USING (
    id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own businesses" ON businesses
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their businesses" ON businesses
  FOR UPDATE USING (
    id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid() AND role = 'owner')
  );

-- Policies for users_businesses
CREATE POLICY "Users can view their own business relationships" ON users_businesses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can manage business users" ON users_businesses
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Policies for barbers (public read for active, authenticated write)
CREATE POLICY "Anyone can view active barbers" ON barbers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Business members can manage barbers" ON barbers
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid())
  );

-- Policies for services (public read for active, authenticated write)
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Business members can manage services" ON services
  FOR ALL USING (
    business_id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid())
  );

-- Policies for barbers_services
CREATE POLICY "Anyone can view barber services" ON barbers_services
  FOR SELECT USING (true);

CREATE POLICY "Business members can manage barber services" ON barbers_services
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM barbers WHERE business_id IN (
        SELECT business_id FROM users_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for schedules (public read, authenticated write)
CREATE POLICY "Anyone can view schedules" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "Business members can manage schedules" ON schedules
  FOR ALL USING (
    barber_id IN (
      SELECT id FROM barbers WHERE business_id IN (
        SELECT business_id FROM users_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for appointments (public read for confirmed, public insert, authenticated update)
CREATE POLICY "Anyone can view confirmed appointments" ON appointments
  FOR SELECT USING (status = 'confirmed');

CREATE POLICY "Anyone can create appointments" ON appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Business members can view all appointments" ON appointments
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid())
  );

CREATE POLICY "Business members can update appointments" ON appointments
  FOR UPDATE USING (
    business_id IN (SELECT business_id FROM users_businesses WHERE user_id = auth.uid())
  );

-- Policies for notifications
CREATE POLICY "Business members can view notifications" ON notifications
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE business_id IN (
        SELECT business_id FROM users_businesses WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON barbers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
