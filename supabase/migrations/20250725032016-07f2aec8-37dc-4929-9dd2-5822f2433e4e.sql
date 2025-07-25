-- KW Rent Flow ERP Database Schema
-- Multi-tenant car rental management system for Kuwait

-- ========================================
-- TENANT MANAGEMENT (Multi-tenancy Support)
-- ========================================

-- Companies (Tenants) Table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    commercial_register TEXT UNIQUE,
    license_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    address_ar TEXT,
    city TEXT DEFAULT 'Kuwait City',
    country TEXT DEFAULT 'Kuwait',
    currency TEXT DEFAULT 'KWD',
    logo_url TEXT,
    subscription_plan TEXT DEFAULT 'basic',
    subscription_status TEXT DEFAULT 'active',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ========================================
-- USER PROFILES AND ROLES
-- ========================================

-- User Profiles Table
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    first_name_ar TEXT,
    last_name_ar TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    national_id TEXT,
    position TEXT,
    position_ar TEXT,
    is_active BOOLEAN DEFAULT true,
    language_preference TEXT DEFAULT 'ar',
    timezone TEXT DEFAULT 'Asia/Kuwait',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles Enum
CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'company_admin', 
    'manager',
    'accountant',
    'fleet_manager',
    'sales_agent',
    'employee'
);

-- User Roles Table
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    permissions JSONB DEFAULT '{}',
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, company_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- FLEET MANAGEMENT
-- ========================================

-- Vehicle Categories
CREATE TABLE public.vehicle_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    daily_rate DECIMAL(10,3) DEFAULT 0,
    weekly_rate DECIMAL(10,3) DEFAULT 0,
    monthly_rate DECIMAL(10,3) DEFAULT 0,
    deposit_amount DECIMAL(10,3) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

-- Vehicle Status Enum
CREATE TYPE public.vehicle_status AS ENUM (
    'available',
    'rented',
    'maintenance',
    'out_of_service',
    'reserved'
);

-- Vehicles Table
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE SET NULL,
    plate_number TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT,
    color_ar TEXT,
    vin_number TEXT,
    registration_number TEXT,
    insurance_policy TEXT,
    insurance_expiry TIMESTAMP WITH TIME ZONE,
    license_expiry TIMESTAMP WITH TIME ZONE,
    status vehicle_status DEFAULT 'available',
    odometer_reading INTEGER DEFAULT 0,
    fuel_level INTEGER DEFAULT 100,
    location TEXT,
    daily_rate DECIMAL(10,3),
    weekly_rate DECIMAL(10,3),
    monthly_rate DECIMAL(10,3),
    deposit_amount DECIMAL(10,3),
    notes TEXT,
    images JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, plate_number)
);

-- Enable RLS
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CUSTOMER MANAGEMENT
-- ========================================

-- Customer Type Enum
CREATE TYPE public.customer_type AS ENUM (
    'individual',
    'corporate'
);

-- Customers Table
CREATE TABLE public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    customer_type customer_type DEFAULT 'individual',
    first_name TEXT,
    last_name TEXT,
    first_name_ar TEXT,
    last_name_ar TEXT,
    company_name TEXT,
    company_name_ar TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    alternative_phone TEXT,
    national_id TEXT,
    passport_number TEXT,
    license_number TEXT,
    license_expiry TIMESTAMP WITH TIME ZONE,
    address TEXT,
    address_ar TEXT,
    city TEXT DEFAULT 'Kuwait City',
    country TEXT DEFAULT 'Kuwait',
    date_of_birth DATE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    credit_limit DECIMAL(10,3) DEFAULT 0,
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    notes TEXT,
    documents JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- SECURITY DEFINER FUNCTIONS
-- ========================================

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Function to get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT company_id
    FROM public.profiles
    WHERE user_id = _user_id
$$;

-- Function to check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
        AND company_id = _company_id
    )
$$;

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================

-- Companies RLS Policies
CREATE POLICY "Super admins can manage all companies"
    ON public.companies
    FOR ALL
    USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own company"
    ON public.companies
    FOR SELECT
    USING (id = public.get_user_company(auth.uid()));

-- Profiles RLS Policies
CREATE POLICY "Users can view profiles in their company"
    ON public.profiles
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'super_admin') OR
        company_id = public.get_user_company(auth.uid())
    );

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles in their company"
    ON public.profiles
    FOR ALL
    USING (
        public.has_role(auth.uid(), 'super_admin') OR
        (company_id = public.get_user_company(auth.uid()) AND 
         (public.has_role(auth.uid(), 'company_admin') OR public.has_role(auth.uid(), 'manager')))
    );

-- User Roles RLS Policies
CREATE POLICY "Users can view roles in their company"
    ON public.user_roles
    FOR SELECT
    USING (
        public.has_role(auth.uid(), 'super_admin') OR
        company_id = public.get_user_company(auth.uid())
    );

CREATE POLICY "Admins can manage roles in their company"
    ON public.user_roles
    FOR ALL
    USING (
        public.has_role(auth.uid(), 'super_admin') OR
        (company_id = public.get_user_company(auth.uid()) AND 
         public.has_role(auth.uid(), 'company_admin'))
    );

-- Vehicle Categories RLS Policies
CREATE POLICY "Users can view categories in their company"
    ON public.vehicle_categories
    FOR SELECT
    USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Managers can manage categories in their company"
    ON public.vehicle_categories
    FOR ALL
    USING (
        company_id = public.get_user_company(auth.uid()) AND
        (public.has_role(auth.uid(), 'company_admin') OR 
         public.has_role(auth.uid(), 'manager') OR 
         public.has_role(auth.uid(), 'fleet_manager'))
    );

-- Vehicles RLS Policies
CREATE POLICY "Users can view vehicles in their company"
    ON public.vehicles
    FOR SELECT
    USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Fleet managers can manage vehicles in their company"
    ON public.vehicles
    FOR ALL
    USING (
        company_id = public.get_user_company(auth.uid()) AND
        (public.has_role(auth.uid(), 'company_admin') OR 
         public.has_role(auth.uid(), 'manager') OR 
         public.has_role(auth.uid(), 'fleet_manager'))
    );

-- Customers RLS Policies
CREATE POLICY "Users can view customers in their company"
    ON public.customers
    FOR SELECT
    USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Staff can manage customers in their company"
    ON public.customers
    FOR ALL
    USING (
        company_id = public.get_user_company(auth.uid()) AND
        (public.has_role(auth.uid(), 'company_admin') OR 
         public.has_role(auth.uid(), 'manager') OR 
         public.has_role(auth.uid(), 'sales_agent'))
    );

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicle_categories_updated_at
    BEFORE UPDATE ON public.vehicle_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- PROFILE CREATION TRIGGER
-- ========================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (
        user_id, 
        first_name, 
        last_name, 
        email
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'مستخدم'),
        COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'جديد'),
        NEW.email
    );
    RETURN NEW;
END;
$$;

-- Trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();