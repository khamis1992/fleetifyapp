-- Fix corrupted Arabic titles on legal_workflow tasks (control chars / mojibake leftovers).
-- Rebuilds title from metadata.workflow_key + case_number when available.

BEGIN;

WITH task_fix AS (
  SELECT
    t.id,
    t.company_id,
    t.title AS old_title,
    t.metadata->>'workflow_key' AS workflow_key,
    COALESCE(
      UPPER((regexp_match(t.title, 'CASE-[0-9]{2}-[0-9]{4}', 'i'))[1]),
      lc.case_number
    ) AS case_number
  FROM public.tasks t
  LEFT JOIN public.legal_cases lc
    ON lc.id = NULLIF(t.metadata->>'legal_case_id', '')::uuid
   AND lc.company_id = t.company_id
  WHERE t.category = 'legal_workflow'
    AND (
      t.title ~ '[\x00-\x1F\x7F-\x9F]'
      OR t.title LIKE '%Ø%'
      OR t.title LIKE '%Ù%'
      OR t.title LIKE '%Ã%'
      OR t.title LIKE '%???%'
      OR t.title ~ '[&!`#@$%^*=\[\]{}|\\<>~^_]'
      OR (
        t.title ~ 'CASE-[0-9]{2}-[0-9]{4}'
        AND length(regexp_replace(t.title, '[^ء-ي]', '', 'g')) BETWEEN 1 AND 12
        AND t.title !~ 'استئناف|جلسة|تحصيل|تنفيذ|تجهيز|حكم|مهلة'
      )
    )
),
computed AS (
  SELECT
    id,
    company_id,
    old_title,
    CASE
      WHEN case_number IS NULL OR btrim(case_number) = '' THEN old_title
      WHEN workflow_key LIKE 'daily-appeal%' THEN 'مهلة استئناف: ' || case_number
      WHEN workflow_key LIKE 'appeal-record%' THEN 'متابعة استئناف ' || case_number
      WHEN workflow_key LIKE 'appeal:%' THEN 'قرار الاستئناف للقضية ' || case_number
      WHEN workflow_key LIKE 'daily-hearing%' THEN 'جلسة قريبة: ' || case_number
      WHEN workflow_key LIKE 'hearing:%' THEN 'متابعة جلسة ' || case_number
      WHEN workflow_key LIKE 'hearing-result%' THEN 'تحديث نتيجة جلسات ' || case_number
      WHEN workflow_key LIKE 'schedule-hearing%' THEN 'تحديد جلسة ' || case_number
      WHEN workflow_key LIKE 'judgment-followup%' THEN 'متابعة حكم ' || case_number
      WHEN workflow_key LIKE 'post-judgment%' THEN 'تحديد إجراء ما بعد الحكم ' || case_number
      WHEN workflow_key LIKE 'daily-enforcement%' OR workflow_key LIKE 'enforcement:%'
        THEN 'متابعة التنفيذ: ' || case_number
      WHEN workflow_key LIKE 'daily-collection%' THEN 'متابعة تحصيل الحكم: ' || case_number
      WHEN workflow_key LIKE 'prepare:%' THEN 'استكمال تجهيز ' || case_number
      WHEN workflow_key LIKE 'post-close%' THEN 'متابعة ما بعد الإغلاق ' || case_number
      WHEN old_title ~* 'appeal|است' THEN 'استئناف القضية ' || case_number
      ELSE 'متابعة القضية ' || case_number
    END AS new_title
  FROM task_fix
)
UPDATE public.tasks t
SET
  title = c.new_title,
  updated_at = now()
FROM computed c
WHERE t.id = c.id
  AND t.company_id = c.company_id
  AND c.new_title IS NOT NULL
  AND c.new_title <> t.title
  AND c.new_title <> c.old_title;

COMMIT;
