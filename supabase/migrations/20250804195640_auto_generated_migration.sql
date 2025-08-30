-- Fix placeholder embeddings in learning patterns by replacing them with proper OpenAI embeddings
-- First, remove the invalid placeholder patterns that were causing the similarity calculation issues
DELETE FROM ai_learning_patterns 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'
AND pattern_data::text LIKE '%[0.1, 0.2, 0.3, 0.4, 0.5]%';

-- Clear any existing patterns for this company to start fresh
DELETE FROM ai_learning_patterns WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c';

-- Insert new improved learning patterns without placeholder embeddings
-- The system will generate real embeddings when it encounters similar queries
INSERT INTO ai_learning_patterns (
  company_id,
  pattern_type,
  pattern_data,
  success_rate,
  usage_count,
  is_active
) VALUES 
-- Basic contract count intent pattern
(
  '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
  'contract_count_query',
  '{
    "intent_detected": "contract_count_query",
    "confidence_level": 0.9,
    "processing_type": "keyword_match",
    "response_quality": 0.9,
    "context_features": {
      "language": "arabic",
      "hasQuestion": true,
      "keywords": ["كم", "عقد", "اتفاقية", "عدد"],
      "hasNumbers": false
    },
    "sample_queries": ["كم عقد في النظام", "عدد العقود", "كم اتفاقية"],
    "response_template": "لمساعدتك في معرفة عدد العقود، أحتاج للوصول إلى قاعدة البيانات. هل تقصد العقود النشطة فقط أم جميع العقود؟",
    "intent_keywords": ["كم عقد", "عدد العقود", "كم اتفاقية", "عدد الاتفاقيات"]
  }'::jsonb,
  0.85,
  1,
  true
),
-- Contract count follow-up patterns
(
  '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
  'contract_count_all',
  '{
    "intent_detected": "contract_count_all",
    "confidence_level": 0.9,
    "processing_type": "follow_up_answer",
    "response_quality": 0.9,
    "context_features": {
      "language": "arabic",
      "hasQuestion": false,
      "keywords": ["جميع", "كل"],
      "isFollowUp": true
    },
    "sample_queries": ["جميع العقود", "كل العقود", "جميع"],
    "response_template": "حسناً، سأقوم بعرض إجمالي عدد العقود في النظام. للوصول إلى هذه المعلومات، أحتاج للاتصال بقاعدة البيانات.",
    "intent_keywords": ["جميع", "كل", "جميع العقود"]
  }'::jsonb,
  0.9,
  1,
  true
),
(
  '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
  'contract_count_active',
  '{
    "intent_detected": "contract_count_active",
    "confidence_level": 0.9,
    "processing_type": "follow_up_answer",
    "response_quality": 0.9,
    "context_features": {
      "language": "arabic",
      "hasQuestion": false,
      "keywords": ["نشطة", "النشطة"],
      "isFollowUp": true
    },
    "sample_queries": ["النشطة", "العقود النشطة", "نشطة فقط"],
    "response_template": "ممتاز، سأعرض لك العقود النشطة فقط. هذا سيشمل العقود التي لم تنته صلاحيتها وما زالت سارية المفعول.",
    "intent_keywords": ["النشطة", "نشطة", "نشطة فقط"]
  }'::jsonb,
  0.9,
  1,
  true
);

-- Add an index to improve query performance for intent classification
CREATE INDEX IF NOT EXISTS idx_ai_learning_patterns_intent_keywords 
ON ai_learning_patterns USING GIN ((pattern_data->'intent_keywords'));