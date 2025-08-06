-- Create table for AI activity logs
CREATE TABLE IF NOT EXISTS public.ai_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_type TEXT NOT NULL,
  details JSONB,
  company_id UUID,
  user_id UUID,
  session_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for saved conversations
CREATE TABLE IF NOT EXISTS public.saved_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID,
  session_id TEXT,
  conversation_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_activity_logs
CREATE POLICY "Users can view their company's AI logs" 
ON public.ai_activity_logs 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert AI logs for their company" 
ON public.ai_activity_logs 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

-- Create policies for saved_conversations
CREATE POLICY "Users can view their company's conversations" 
ON public.saved_conversations 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations for their company" 
ON public.saved_conversations 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own conversations" 
ON public.saved_conversations 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ) AND user_id = auth.uid()
);

CREATE POLICY "Users can delete their own conversations" 
ON public.saved_conversations 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
  ) AND user_id = auth.uid()
);

-- Create indexes for better performance
CREATE INDEX idx_ai_activity_logs_company_id ON public.ai_activity_logs(company_id);
CREATE INDEX idx_ai_activity_logs_timestamp ON public.ai_activity_logs(timestamp);
CREATE INDEX idx_ai_activity_logs_activity_type ON public.ai_activity_logs(activity_type);

CREATE INDEX idx_saved_conversations_company_id ON public.saved_conversations(company_id);
CREATE INDEX idx_saved_conversations_user_id ON public.saved_conversations(user_id);
CREATE INDEX idx_saved_conversations_created_at ON public.saved_conversations(created_at);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_saved_conversations_updated_at
  BEFORE UPDATE ON public.saved_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();