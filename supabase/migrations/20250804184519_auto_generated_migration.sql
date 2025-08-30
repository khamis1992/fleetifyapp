-- Create tables for the self-learning AI system

-- Table to store query intents and classifications
CREATE TABLE public.ai_query_intents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  original_query TEXT NOT NULL,
  normalized_query TEXT,
  intent_classification TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  context_data JSONB DEFAULT '{}',
  user_confirmed BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store clarification conversations
CREATE TABLE public.ai_clarification_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  original_query TEXT NOT NULL,
  clarification_questions JSONB NOT NULL DEFAULT '[]',
  user_responses JSONB NOT NULL DEFAULT '{}',
  final_intent TEXT,
  session_status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Table to store learning feedback and performance metrics
CREATE TABLE public.ai_learning_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  query_intent_id UUID,
  clarification_session_id UUID,
  feedback_type TEXT NOT NULL, -- 'helpful', 'accurate', 'improvement_needed'
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comments TEXT,
  improvement_suggestions JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store learning patterns and improvements
CREATE TABLE public.ai_learning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  pattern_type TEXT NOT NULL, -- 'query_similarity', 'intent_classification', 'context_analysis'
  pattern_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table to store performance metrics
CREATE TABLE public.ai_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_queries INTEGER DEFAULT 0,
  successful_classifications INTEGER DEFAULT 0,
  clarification_requests INTEGER DEFAULT 0,
  user_satisfaction_avg NUMERIC DEFAULT 0,
  learning_improvements INTEGER DEFAULT 0,
  response_time_avg NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_query_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_clarification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage AI data in their company" 
ON public.ai_query_intents 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage clarification sessions in their company" 
ON public.ai_clarification_sessions 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage learning feedback in their company" 
ON public.ai_learning_feedback 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage learning patterns in their company" 
ON public.ai_learning_patterns 
FOR ALL 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can view performance metrics in their company" 
ON public.ai_performance_metrics 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can insert performance metrics" 
ON public.ai_performance_metrics 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_ai_query_intents_company_id ON public.ai_query_intents(company_id);
CREATE INDEX idx_ai_query_intents_intent ON public.ai_query_intents(intent_classification);
CREATE INDEX idx_ai_clarification_sessions_company_id ON public.ai_clarification_sessions(company_id);
CREATE INDEX idx_ai_learning_feedback_company_id ON public.ai_learning_feedback(company_id);
CREATE INDEX idx_ai_learning_patterns_company_id ON public.ai_learning_patterns(company_id);
CREATE INDEX idx_ai_performance_metrics_company_date ON public.ai_performance_metrics(company_id, metric_date);

-- Create function to update performance metrics
CREATE OR REPLACE FUNCTION public.update_ai_performance_metrics(company_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    total_queries_count INTEGER;
    successful_count INTEGER;
    clarification_count INTEGER;
    avg_satisfaction NUMERIC;
    improvements_count INTEGER;
BEGIN
    -- Count today's queries
    SELECT COUNT(*) INTO total_queries_count
    FROM ai_query_intents
    WHERE company_id = company_id_param 
    AND DATE(created_at) = today_date;
    
    -- Count successful classifications
    SELECT COUNT(*) INTO successful_count
    FROM ai_query_intents
    WHERE company_id = company_id_param 
    AND DATE(created_at) = today_date
    AND user_confirmed = true;
    
    -- Count clarification requests
    SELECT COUNT(*) INTO clarification_count
    FROM ai_clarification_sessions
    WHERE company_id = company_id_param 
    AND DATE(created_at) = today_date;
    
    -- Calculate average satisfaction
    SELECT AVG(feedback_rating) INTO avg_satisfaction
    FROM ai_learning_feedback
    WHERE company_id = company_id_param 
    AND DATE(created_at) = today_date;
    
    -- Count learning improvements
    SELECT COUNT(*) INTO improvements_count
    FROM ai_learning_patterns
    WHERE company_id = company_id_param 
    AND DATE(created_at) = today_date;
    
    -- Insert or update metrics
    INSERT INTO ai_performance_metrics (
        company_id,
        metric_date,
        total_queries,
        successful_classifications,
        clarification_requests,
        user_satisfaction_avg,
        learning_improvements
    ) VALUES (
        company_id_param,
        today_date,
        total_queries_count,
        successful_count,
        clarification_count,
        COALESCE(avg_satisfaction, 0),
        improvements_count
    ) ON CONFLICT (company_id, metric_date) 
    DO UPDATE SET
        total_queries = EXCLUDED.total_queries,
        successful_classifications = EXCLUDED.successful_classifications,
        clarification_requests = EXCLUDED.clarification_requests,
        user_satisfaction_avg = EXCLUDED.user_satisfaction_avg,
        learning_improvements = EXCLUDED.learning_improvements,
        created_at = now();
END;
$$;