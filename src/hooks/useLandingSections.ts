import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingSections = () => {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_sections')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSection = async (sectionData: any) => {
    const { data, error } = await supabase
      .from('landing_sections')
      .insert(sectionData)
      .select()
      .single();
    
    if (error) throw error;
    setSections(prev => [...prev, data]);
    return data;
  };

  const updateSection = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('landing_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setSections(prev => prev.map(s => s.id === id ? data : s));
    return data;
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase
      .from('landing_sections')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setSections(prev => prev.filter(s => s.id !== id));
  };

  useEffect(() => {
    fetchSections();
  }, []);

  return { sections, loading, createSection, updateSection, deleteSection };
};