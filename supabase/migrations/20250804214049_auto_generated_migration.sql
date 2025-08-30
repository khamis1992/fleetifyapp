-- Create table for AI learning patterns
CREATE TABLE IF NOT EXISTS public.ai_learning_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_id TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  category TEXT NOT NULL,
  user_feedback TEXT CHECK (user_feedback IN ('positive', 'negative', 'neutral')),
  confidence DECIMAL(5,2) NOT NULL,
  response_time INTEGER NOT NULL,
  corrected_classification TEXT,
  context_factors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for enhanced clarification sessions
CREATE TABLE IF NOT EXISTS public.ai_clarification_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  user_id UUID REFERENCES auth.users(id),
  original_query TEXT NOT NULL,
  normalized_query TEXT,
  detected_language TEXT DEFAULT 'english',
  query_intent TEXT DEFAULT 'general',
  context_provided JSONB,
  complexity_score INTEGER CHECK (complexity_score BETWEEN 1 AND 10),
  ambiguity_level INTEGER CHECK (ambiguity_level BETWEEN 1 AND 10),
  questions_generated TEXT[],
  strategy_used TEXT,
  confidence_level INTEGER CHECK (confidence_level BETWEEN 0 AND 100),
  estimated_steps INTEGER,
  context_factors TEXT[],
  user_responses JSONB,
  final_query TEXT,
  session_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_clarification_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_learning_patterns
CREATE POLICY "Users can view their company's learning patterns" 
ON public.ai_learning_patterns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_learning_patterns.company_id
  )
);

CREATE POLICY "Users can create learning patterns for their company" 
ON public.ai_learning_patterns 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_learning_patterns.company_id
  )
);

CREATE POLICY "Users can update their company's learning patterns" 
ON public.ai_learning_patterns 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_learning_patterns.company_id
  )
);

-- Create policies for ai_clarification_sessions
CREATE POLICY "Users can view their company's clarification sessions" 
ON public.ai_clarification_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_clarification_sessions.company_id
  )
);

CREATE POLICY "Users can create clarification sessions for their company" 
ON public.ai_clarification_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_clarification_sessions.company_id
  )
);

CREATE POLICY "Users can update their company's clarification sessions" 
ON public.ai_clarification_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu 
    WHERE cu.user_id = auth.uid() 
    AND cu.company_id = ai_clarification_sessions.company_id
  )
);

-- Create indexes for better performance
CREATE INDEX idx_learning_patterns_company_id ON public.ai_learning_patterns(company_id);
CREATE INDEX idx_learning_patterns_category ON public.ai_learning_patterns(category);
CREATE INDEX idx_learning_patterns_feedback ON public.ai_learning_patterns(user_feedback);
CREATE INDEX idx_learning_patterns_created_at ON public.ai_learning_patterns(created_at);

CREATE INDEX idx_clarification_sessions_company_id ON public.ai_clarification_sessions(company_id);
CREATE INDEX idx_clarification_sessions_user_id ON public.ai_clarification_sessions(user_id);
CREATE INDEX idx_clarification_sessions_created_at ON public.ai_clarification_sessions(created_at);
CREATE INDEX idx_clarification_sessions_completed ON public.ai_clarification_sessions(session_completed);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_learning_patterns_updated_at
  BEFORE UPDATE ON public.ai_learning_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clarification_sessions_updated_at
  BEFORE UPDATE ON public.ai_clarification_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();