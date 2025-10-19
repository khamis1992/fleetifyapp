import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LandingContent {
  id: string;
  content_key: string;
  content_type: string;
  content_value: string | null;
  content_value_ar: string | null;
  created_at: string | null;
  is_active: boolean | null;
  link_url: string | null;
  media_url: string | null;
  metadata: Record<string, unknown>;
  section_id: string | null;
  sort_order: number | null;
  updated_at: string | null;
}

export const useLandingContent = () => {
  const [content, setContent] = useState<LandingContent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_content')
        .select('*')
        .order('sort_order');
      
      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching landing content:', error);
    } finally {
      setLoading(false);
    }
  };

  const createContent = async (contentData: any) => {
    const { data, error } = await supabase
      .from('landing_content')
      .insert(contentData)
      .select()
      .single();
    
    if (error) throw error;
    setContent(prev => [...prev, data]);
    return data;
  };

  const updateContent = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('landing_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setContent(prev => prev.map(c => c.id === id ? data : c));
    return data;
  };

  const deleteContent = async (id: string) => {
    const { error } = await supabase
      .from('landing_content')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setContent(prev => prev.filter(c => c.id !== id));
  };

  const getContentByKey = (key: string, language: 'en' | 'ar' = 'en') => {
    const item = content.find(c => c.content_key === key && c.is_active);
    if (!item) return '';
    return language === 'ar' ? (item.content_value_ar || item.content_value) : (item.content_value || item.content_value_ar);
  };

  useEffect(() => {
    fetchContent();
  }, []);

  return { 
    content, 
    loading, 
    createContent, 
    updateContent, 
    deleteContent, 
    getContentByKey,
    refreshContent: fetchContent
  };
};