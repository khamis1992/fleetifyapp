-- Add sample pricing data to existing vehicles that have no pricing
UPDATE public.vehicles 
SET 
  daily_rate = CASE 
    WHEN make ILIKE '%toyota%' OR make ILIKE '%nissan%' THEN 25.000
    WHEN make ILIKE '%bmw%' OR make ILIKE '%mercedes%' OR make ILIKE '%audi%' THEN 50.000
    WHEN make ILIKE '%hyundai%' OR make ILIKE '%kia%' THEN 20.000
    ELSE 30.000
  END,
  weekly_rate = CASE 
    WHEN make ILIKE '%toyota%' OR make ILIKE '%nissan%' THEN 150.000
    WHEN make ILIKE '%bmw%' OR make ILIKE '%mercedes%' OR make ILIKE '%audi%' THEN 300.000
    WHEN make ILIKE '%hyundai%' OR make ILIKE '%kia%' THEN 120.000
    ELSE 180.000
  END,
  monthly_rate = CASE 
    WHEN make ILIKE '%toyota%' OR make ILIKE '%nissan%' THEN 600.000
    WHEN make ILIKE '%bmw%' OR make ILIKE '%mercedes%' OR make ILIKE '%audi%' THEN 1200.000
    WHEN make ILIKE '%hyundai%' OR make ILIKE '%kia%' THEN 480.000
    ELSE 720.000
  END,
  deposit_amount = CASE 
    WHEN make ILIKE '%toyota%' OR make ILIKE '%nissan%' THEN 100.000
    WHEN make ILIKE '%bmw%' OR make ILIKE '%mercedes%' OR make ILIKE '%audi%' THEN 200.000
    WHEN make ILIKE '%hyundai%' OR make ILIKE '%kia%' THEN 80.000
    ELSE 120.000
  END,
  updated_at = now()
WHERE is_active = true 
AND (daily_rate IS NULL OR daily_rate = 0 OR weekly_rate IS NULL OR weekly_rate = 0 OR monthly_rate IS NULL OR monthly_rate = 0);