-- Update the ai_learning_patterns table to use correct foreign key references
ALTER TABLE public.ai_learning_patterns 
DROP COLUMN IF EXISTS company_id,
DROP COLUMN IF EXISTS user_id,
ADD COLUMN company_id UUID REFERENCES public.companies(id),
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update the ai_clarification_sessions table to use correct foreign key references  
ALTER TABLE public.ai_clarification_sessions
DROP COLUMN IF EXISTS company_id,
DROP COLUMN IF EXISTS user_id,
ADD COLUMN company_id UUID REFERENCES public.companies(id),
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for ai_learning_patterns
DROP POLICY IF EXISTS "Users can view their company's learning patterns" ON public.ai_learning_patterns;
DROP POLICY IF EXISTS "Users can create learning patterns for their company" ON public.ai_learning_patterns;
DROP POLICY IF EXISTS "Users can update their company's learning patterns" ON public.ai_learning_patterns;

CREATE POLICY "Users can view learning patterns in their company" 
ON public.ai_learning_patterns 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_learning_patterns.company_id
  )
);

CREATE POLICY "Users can create learning patterns for their company" 
ON public.ai_learning_patterns 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_learning_patterns.company_id
  )
);

CREATE POLICY "Users can update learning patterns in their company" 
ON public.ai_learning_patterns 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_learning_patterns.company_id
  )
);

-- Update RLS policies for ai_clarification_sessions
DROP POLICY IF EXISTS "Users can view their company's clarification sessions" ON public.ai_clarification_sessions;
DROP POLICY IF EXISTS "Users can create clarification sessions for their company" ON public.ai_clarification_sessions;
DROP POLICY IF EXISTS "Users can update their company's clarification sessions" ON public.ai_clarification_sessions;

CREATE POLICY "Users can view clarification sessions in their company" 
ON public.ai_clarification_sessions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_clarification_sessions.company_id
  )
);

CREATE POLICY "Users can create clarification sessions for their company" 
ON public.ai_clarification_sessions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_clarification_sessions.company_id
  )
);

CREATE POLICY "Users can update clarification sessions in their company" 
ON public.ai_clarification_sessions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.company_id = ai_clarification_sessions.company_id
  )
);