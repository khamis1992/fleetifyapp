import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingThemes = () => {
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThemes = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_themes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setThemes(data || []);
    } catch (error) {
      console.error('Error fetching themes:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTheme = async (themeData: any) => {
    const { data, error } = await supabase
      .from('landing_themes')
      .insert(themeData)
      .select()
      .single();
    
    if (error) throw error;
    setThemes(prev => [data, ...prev]);
    return data;
  };

  const updateTheme = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('landing_themes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setThemes(prev => prev.map(t => t.id === id ? data : t));
    return data;
  };

  const deleteTheme = async (id: string) => {
    const { error } = await supabase
      .from('landing_themes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setThemes(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    fetchThemes();
  }, []);

  return { themes, loading, createTheme, updateTheme, deleteTheme };
};