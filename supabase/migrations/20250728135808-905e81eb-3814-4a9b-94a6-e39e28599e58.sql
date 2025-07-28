-- Create a test dispatch permit with a valid request_type
INSERT INTO public.vehicle_dispatch_permits (
    company_id,
    permit_number,
    vehicle_id,
    requested_by,
    request_type,
    purpose,
    purpose_ar,
    destination,
    destination_ar,
    start_date,
    end_date,
    start_time,
    end_time,
    estimated_km,
    fuel_allowance,
    driver_name,
    driver_phone,
    status,
    priority,
    notes
) VALUES (
    '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c', -- Current user's company
    'DP-25-0001', -- Test permit number
    (SELECT id FROM public.vehicles WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' AND is_active = true LIMIT 1), -- First available vehicle
    '33104f93-57e7-4e5d-993f-a1e6be1cb121', -- Current user's ID
    'business', -- Using a valid request type
    'Test dispatch permit for system verification',
    'تصريح تنقل تجريبي للتحقق من النظام',
    'Doha City Center',
    'مركز مدينة الدوحة',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 day',
    '09:00',
    '17:00',
    50,
    25.00,
    'Test Driver',
    '+974-5555-1234',
    'pending',
    'normal',
    'Test permit created to verify dispatch system functionality'
);