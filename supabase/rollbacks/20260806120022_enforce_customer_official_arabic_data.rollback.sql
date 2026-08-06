drop trigger if exists trg_enforce_customer_official_arabic_data on public.customers;
drop function if exists public.enforce_customer_official_arabic_data();
drop function if exists public.has_arabic_text(text);
