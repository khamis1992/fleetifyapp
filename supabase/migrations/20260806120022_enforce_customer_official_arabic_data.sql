-- Enforce official Arabic customer data at the database boundary.
-- Existing legacy rows can still receive operational updates; this guard
-- applies to new customers and changes to official identity fields.

create or replace function public.has_arabic_text(value text)
returns boolean
language sql
immutable
as $$
  select coalesce(value, '') ~ ('[' || chr(1569) || '-' || chr(1610) || ']');
$$;

create or replace function public.enforce_customer_official_arabic_data()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if not public.has_arabic_text(new.nationality) then
      raise exception 'الجنسية العربية مطلوبة للعميل'
        using errcode = '23514';
    end if;

    if coalesce(new.customer_type::text, 'individual') in ('corporate', 'company') then
      if not public.has_arabic_text(new.company_name_ar) then
        raise exception 'اسم الشركة العربي مطلوب للعميل'
          using errcode = '23514';
      end if;
    else
      if not public.has_arabic_text(new.first_name_ar) or not public.has_arabic_text(new.last_name_ar) then
        raise exception 'الاسم العربي الأول والأخير مطلوبان للعميل'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.nationality is distinct from old.nationality
       and not public.has_arabic_text(new.nationality) then
      raise exception 'الجنسية العربية مطلوبة للعميل'
        using errcode = '23514';
    end if;

    if coalesce(new.customer_type::text, 'individual') in ('corporate', 'company') then
      if (new.customer_type is distinct from old.customer_type
          or new.company_name_ar is distinct from old.company_name_ar)
         and not public.has_arabic_text(new.company_name_ar) then
        raise exception 'اسم الشركة العربي مطلوب للعميل'
          using errcode = '23514';
      end if;
    else
      if (new.customer_type is distinct from old.customer_type
          or new.first_name_ar is distinct from old.first_name_ar
          or new.last_name_ar is distinct from old.last_name_ar)
         and (not public.has_arabic_text(new.first_name_ar)
              or not public.has_arabic_text(new.last_name_ar)) then
        raise exception 'الاسم العربي الأول والأخير مطلوبان للعميل'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_customer_official_arabic_data on public.customers;

create trigger trg_enforce_customer_official_arabic_data
before insert or update of customer_type, first_name_ar, last_name_ar, company_name_ar, nationality
on public.customers
for each row
execute function public.enforce_customer_official_arabic_data();
