import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLandingMedia = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_media')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `landing-media/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('landing-media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('landing-media')
      .getPublicUrl(filePath);

    const mediaData = {
      file_name: file.name,
      file_path: publicUrl,
      file_type: file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'document',
      file_size: file.size,
      mime_type: file.type,
      tags: [],
      company_id: '00000000-0000-0000-0000-000000000000'
    };

    const { data, error } = await supabase
      .from('landing_media')
      .insert(mediaData)
      .select()
      .single();

    if (error) throw error;
    setMedia(prev => [data, ...prev]);
    return data;
  };

  const updateMedia = async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('landing_media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    setMedia(prev => prev.map(m => m.id === id ? data : m));
    return data;
  };

  const deleteMedia = async (id: string) => {
    const { error } = await supabase
      .from('landing_media')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  return { media, loading, uploadMedia, updateMedia, deleteMedia };
};