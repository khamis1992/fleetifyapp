import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingABTests = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_ab_tests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTests(data || []);
    } catch (error) {
      console.error('Error fetching A/B tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTest = async (testData: any) => {
    const { data, error } = await supabase
      .from('landing_ab_tests')
      .insert(testData)
      .select()
      .single();
    
    if (error) throw error;
    setTests(prev => [data, ...prev]);
    return data;
  };

  const updateTest = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('landing_ab_tests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setTests(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const deleteTest = async (id: string) => {
    const { error } = await supabase
      .from('landing_ab_tests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setTests(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    fetchTests();
  }, []);

  return { tests, loading, createTest, updateTest, deleteTest };
};