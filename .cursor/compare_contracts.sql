-- مقارنة العقود النشطة مع قائمة المركبات من ملف JSON
-- البحث عن عقود نشطة غير موجودة في القائمة

WITH json_plates AS (
  SELECT unnest(ARRAY[
    '10172', '10174', '10197', '11473', '153974', '185485', '185513', '185573',
    '21849', '21860', '2766', '2767', '2768', '2769', '2770', '2771', '2772',
    '2773', '2774', '2775', '2776', '2777', '2778', '2779', '2780', '2782',
    '2784', '2798', '381247', '4015', '4016', '4018', '5889', '5890', '5893',
    '5896', '5897', '5898', '5899', '5900', '599720', '603353', '648144',
    '676281', '7034', '7036', '7038', '7039', '7041', '7043', '7053', '7054',
    '7056', '7058', '7059', '7061', '706150', '7062', '7063', '7066', '7068',
    '7069', '7072', '7074', '7077', '7078', '721894', '725473', '8203', '8206',
    '8207', '8208', '8211', '8212', '8213', '8214', '856589', '856715', '856718',
    '856878', '856925', '857045', '857051', '862165', '862169', '893406',
    '893409', '893410', '893411', '10663', '10664', '10665', '10666', '10668',
    '10669', '10671', '10672', '10853', '10857'
  ]) as plate_number
),
active_contracts AS (
  SELECT 
    c.id,
    c.contract_number,
    c.status,
    c.start_date,
    c.monthly_amount::numeric(10,0) as monthly_amount,
    REPLACE(v.plate_number, ' ', '') as plate_number_clean,
    v.plate_number as plate_number_original,
    CASE 
      WHEN cust.customer_type = 'individual' THEN 
        TRIM(COALESCE(cust.first_name_ar || ' ' || cust.last_name_ar, cust.first_name || ' ' || cust.last_name, ''))
      WHEN cust.customer_type = 'corporate' THEN 
        TRIM(COALESCE(cust.company_name_ar, cust.company_name, ''))
      ELSE ''
    END as customer_name,
    cust.phone as customer_phone
  FROM contracts c
  LEFT JOIN vehicles v ON c.vehicle_id = v.id
  LEFT JOIN customers cust ON c.customer_id = cust.id
  WHERE c.status IN ('active', 'rented', 'approved')
    AND v.plate_number IS NOT NULL
)
SELECT 
  ac.contract_number,
  ac.status,
  ac.start_date,
  ac.monthly_amount,
  ac.plate_number_original as plate_number,
  ac.customer_name,
  ac.customer_phone,
  CASE WHEN jp.plate_number IS NULL THEN 'غير موجود في القائمة' ELSE 'موجود' END as in_list
FROM active_contracts ac
LEFT JOIN json_plates jp ON REPLACE(ac.plate_number_clean, ' ', '') = jp.plate_number
ORDER BY 
  CASE WHEN jp.plate_number IS NULL THEN 0 ELSE 1 END,
  ac.contract_number;

