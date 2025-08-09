
-- 1) دالة تتحقق من كون المستخدم Super Admin
create or replace function public.is_super_admin(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = p_user_id
      and ur.role = 'super_admin'
  );
$$;

-- 2) سياسات إضافية تسمح لـ super_admin بكل العمليات على جدول vehicles
-- ملاحظة: لا نحذف السياسات الموجودة، بل نضيف سياسات permissive بديلة تُجمع بالـ OR

-- عرض كل المركبات لأي شركة إذا كان Super Admin
create policy "Super admins can view all vehicles"
  on public.vehicles
  for select
  using (public.is_super_admin(auth.uid()));

-- إدخال في أي شركة إذا كان Super Admin
create policy "Super admins can insert vehicles for any company"
  on public.vehicles
  for insert
  with check (public.is_super_admin(auth.uid()) or company_id = get_user_company(auth.uid()));

-- تحديث أي مركبة إذا كان Super Admin
create policy "Super admins can update all vehicles"
  on public.vehicles
  for update
  using (public.is_super_admin(auth.uid()) or company_id = get_user_company(auth.uid()))
  with check (public.is_super_admin(auth.uid()) or company_id = get_user_company(auth.uid()));

-- حذف أي مركبة إذا كان Super Admin
create policy "Super admins can delete all vehicles"
  on public.vehicles
  for delete
  using (public.is_super_admin(auth.uid()) or company_id = get_user_company(auth.uid()));
