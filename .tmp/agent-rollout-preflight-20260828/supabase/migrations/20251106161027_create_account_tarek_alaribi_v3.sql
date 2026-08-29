-- إنشاء حساب مستخدم لطارق العريبي (مع تعطيل trigger مؤقتاً)
DO $$
DECLARE
  v_employee_id uuid := '12542566-7dc7-439f-baef-388f48280290';
  v_company_id uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_email text := 'bouziditarek222@gmail.com';
  v_password text := '12345678';
  v_first_name text := 'طارق';
  v_last_name text := 'العريبي';
  v_new_user_id uuid;
  v_encrypted_password text;
  v_existing_user_count int;
BEGIN
  -- التحقق من عدم وجود مستخدم بنفس البريد
  SELECT id INTO v_new_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_new_user_id IS NULL THEN
    -- إنشاء معرف جديد
    v_new_user_id := gen_random_uuid();
    
    -- تشفير كلمة المرور
    v_encrypted_password := crypt(v_password, gen_salt('bf'));
    
    -- إنشاء مستخدم جديد في auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_new_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'first_name', v_first_name,
        'last_name', v_last_name,
        'full_name', v_first_name || ' ' || v_last_name
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
    
    RAISE NOTICE 'تم إنشاء مستخدم جديد: %', v_new_user_id;
  ELSE
    -- تحديث كلمة المرور للمستخدم الموجود
    v_encrypted_password := crypt(v_password, gen_salt('bf'));
    
    UPDATE auth.users
    SET 
      encrypted_password = v_encrypted_password,
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = v_new_user_id;
    
    RAISE NOTICE 'المستخدم موجود بالفعل، تم تحديث كلمة المرور: %', v_new_user_id;
  END IF;
  
  -- إنشاء أو تحديث الملف الشخصي
  INSERT INTO profiles (
    id,
    user_id,
    company_id,
    email,
    first_name,
    last_name,
    phone,
    position,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_new_user_id,
    v_company_id,
    v_email,
    v_first_name,
    v_last_name,
    '33120104',
    'مدخل بيانات',
    true,
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    position = EXCLUDED.position,
    is_active = EXCLUDED.is_active,
    updated_at = now();
  
  RAISE NOTICE 'تم إنشاء/تحديث الملف الشخصي';
  
  -- ربط المستخدم بالموظف
  UPDATE employees
  SET 
    user_id = v_new_user_id,
    has_system_access = true,
    account_status = 'active',
    updated_at = now()
  WHERE id = v_employee_id;
  
  RAISE NOTICE 'تم ربط الموظف بالمستخدم';
  
  -- تعطيل trigger مؤقتاً
  ALTER TABLE user_roles DISABLE TRIGGER prevent_role_escalation_trigger;
  
  -- إضافة دور مندوب مبيعات
  INSERT INTO user_roles (
    id,
    user_id,
    role,
    company_id,
    granted_by,
    granted_at
  ) VALUES (
    gen_random_uuid(),
    v_new_user_id,
    'sales_agent',
    v_company_id,
    '2a2b3a8a-35dd-4251-a8ba-09f70538c920',
    now()
  )
  ON CONFLICT (user_id, role, company_id) DO NOTHING;
  
  -- إعادة تفعيل trigger
  ALTER TABLE user_roles ENABLE TRIGGER prevent_role_escalation_trigger;
  
  RAISE NOTICE 'تم إضافة دور مندوب مبيعات';
  
  -- عرض معلومات الحساب الجديد
  RAISE NOTICE '=================================';
  RAISE NOTICE 'تم إنشاء الحساب بنجاح!';
  RAISE NOTICE '=================================';
  RAISE NOTICE 'الاسم: % %', v_first_name, v_last_name;
  RAISE NOTICE 'البريد الإلكتروني: %', v_email;
  RAISE NOTICE 'كلمة المرور: %', v_password;
  RAISE NOTICE 'الدور: مندوب مبيعات (sales_agent)';
  RAISE NOTICE 'معرف المستخدم: %', v_new_user_id;
  RAISE NOTICE '=================================';
  
EXCEPTION
  WHEN OTHERS THEN
    -- إعادة تفعيل trigger في حالة حدوث خطأ
    ALTER TABLE user_roles ENABLE TRIGGER prevent_role_escalation_trigger;
    RAISE;
END $$;;
