-- إنشاء مركز تكلفة جديد لعقود الإيجار المنتهي بالتمليك في شركة العراف
INSERT INTO public.cost_centers (
    id,
    company_id,
    center_code,
    center_name,
    center_name_ar,
    description,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '24bc0b21-4e2d-4413-9842-31719a3669f4',
    'CC007',
    'Rent-to-Own Contracts',
    'عقود الإيجار المنتهي بالتمليك',
    'Cost center for managing rent-to-own vehicle contracts and related financial tracking',
    true,
    now(),
    now()
);