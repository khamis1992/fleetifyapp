-- إنشاء تصنيفات التذاكر
CREATE TABLE public.support_ticket_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إدراج التصنيفات الافتراضية
INSERT INTO public.support_ticket_categories (name, name_ar, description, color) VALUES
('Technical Issue', 'مشكلة تقنية', 'Technical problems and bugs', '#ef4444'),
('Feature Request', 'طلب ميزة', 'New feature suggestions', '#10b981'),
('General Inquiry', 'استفسار عام', 'General questions and support', '#3b82f6'),
('Billing', 'الفواتير', 'Billing and payment issues', '#f59e0b'),
('Account', 'الحساب', 'Account management issues', '#8b5cf6');

-- إنشاء جدول تذاكر الدعم
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL UNIQUE,
    company_id UUID NOT NULL,
    created_by UUID NOT NULL,
    assigned_to UUID,
    category_id UUID NOT NULL REFERENCES public.support_ticket_categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    satisfaction_feedback TEXT,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول ردود التذاكر
CREATE TABLE public.support_ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول تقييمات الخدمة
CREATE TABLE public.service_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    rated_by UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    response_time_rating INTEGER CHECK (response_time_rating >= 1 AND response_time_rating <= 5),
    resolution_quality_rating INTEGER CHECK (resolution_quality_rating >= 1 AND resolution_quality_rating <= 5),
    staff_helpfulness_rating INTEGER CHECK (staff_helpfulness_rating >= 1 AND staff_helpfulness_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول قاعدة المعرفة
CREATE TABLE public.knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    title_ar TEXT NOT NULL,
    content TEXT NOT NULL,
    content_ar TEXT NOT NULL,
    category_id UUID REFERENCES public.support_ticket_categories(id),
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX idx_support_ticket_replies_ticket_id ON public.support_ticket_replies(ticket_id);
CREATE INDEX idx_support_ticket_replies_user_id ON public.support_ticket_replies(user_id);
CREATE INDEX idx_service_ratings_company_id ON public.service_ratings(company_id);
CREATE INDEX idx_knowledge_base_articles_category_id ON public.knowledge_base_articles(category_id);

-- تمكين RLS على جميع الجداول
ALTER TABLE public.support_ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان لتصنيفات التذاكر
CREATE POLICY "Anyone can view ticket categories" ON public.support_ticket_categories
    FOR SELECT USING (true);

CREATE POLICY "Super admins can manage ticket categories" ON public.support_ticket_categories
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

-- سياسات الأمان لتذاكر الدعم
CREATE POLICY "Users can view tickets in their company" ON public.support_tickets
    FOR SELECT USING (
        company_id = get_user_company(auth.uid()) OR
        has_role(auth.uid(), 'super_admin'::user_role)
    );

CREATE POLICY "Users can create tickets in their company" ON public.support_tickets
    FOR INSERT WITH CHECK (
        company_id = get_user_company(auth.uid()) AND
        created_by = auth.uid()
    );

CREATE POLICY "Company admins and super admins can manage tickets" ON public.support_tickets
    FOR ALL USING (
        has_role(auth.uid(), 'super_admin'::user_role) OR
        (company_id = get_user_company(auth.uid()) AND 
         (has_role(auth.uid(), 'company_admin'::user_role) OR has_role(auth.uid(), 'manager'::user_role)))
    );

-- سياسات الأمان لردود التذاكر
CREATE POLICY "Users can view replies for their tickets" ON public.support_ticket_replies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets st 
            WHERE st.id = ticket_id AND (
                st.company_id = get_user_company(auth.uid()) OR
                has_role(auth.uid(), 'super_admin'::user_role)
            )
        )
    );

CREATE POLICY "Users can create replies for their tickets" ON public.support_ticket_replies
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.support_tickets st 
            WHERE st.id = ticket_id AND (
                st.company_id = get_user_company(auth.uid()) OR
                has_role(auth.uid(), 'super_admin'::user_role)
            )
        )
    );

-- سياسات الأمان لتقييمات الخدمة
CREATE POLICY "Users can view ratings in their company" ON public.service_ratings
    FOR SELECT USING (
        company_id = get_user_company(auth.uid()) OR
        has_role(auth.uid(), 'super_admin'::user_role)
    );

CREATE POLICY "Users can create ratings for their tickets" ON public.service_ratings
    FOR INSERT WITH CHECK (
        company_id = get_user_company(auth.uid()) AND
        rated_by = auth.uid()
    );

-- سياسات الأمان لقاعدة المعرفة
CREATE POLICY "Anyone can view published articles" ON public.knowledge_base_articles
    FOR SELECT USING (is_published = true);

CREATE POLICY "Super admins can manage all articles" ON public.knowledge_base_articles
    FOR ALL USING (has_role(auth.uid(), 'super_admin'::user_role));

-- دالة لتوليد رقم التذكرة
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    ticket_count INTEGER;
    year_suffix TEXT;
BEGIN
    -- الحصول على السنة الحالية
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- عد التذاكر الموجودة في السنة الحالية
    SELECT COUNT(*) + 1 INTO ticket_count
    FROM public.support_tickets 
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- إرجاع رقم التذكرة المنسق
    RETURN 'TK-' || year_suffix || '-' || LPAD(ticket_count::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- محفز لتوليد رقم التذكرة تلقائياً
CREATE OR REPLACE FUNCTION public.handle_ticket_number_generation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
    BEFORE INSERT ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_ticket_number_generation();

-- محفز لتحديث أول رد
CREATE OR REPLACE FUNCTION public.update_first_response_time()
RETURNS TRIGGER AS $$
BEGIN
    -- تحديث وقت أول رد للتذكرة إذا لم يكن محدداً مسبقاً
    IF NEW.user_id != (SELECT created_by FROM public.support_tickets WHERE id = NEW.ticket_id) THEN
        UPDATE public.support_tickets 
        SET first_response_at = COALESCE(first_response_at, NEW.created_at)
        WHERE id = NEW.ticket_id AND first_response_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_first_response
    AFTER INSERT ON public.support_ticket_replies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_first_response_time();