import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getNumberPreferences, NumberFormatOptions } from "@/utils/numberFormatter";

/**
 * Hook لإدارة تفضيلات تنسيق الأرقام للشركة
 */
export const useNumberPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NumberFormatOptions>(getNumberPreferences());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.profile?.company_id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('number_format_preferences')
          .eq('id', user.profile.company_id)
          .single();

        if (error) {
          console.error('Error fetching number preferences:', error);
          return;
        }

        if (data?.number_format_preferences) {
          setPreferences(data.number_format_preferences);
        }
      } catch (error) {
        console.error('Error fetching number preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.profile?.company_id]);

  const updatePreferences = async (newPreferences: Partial<NumberFormatOptions>) => {
    if (!user?.profile?.company_id) {
      return;
    }

    try {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);

      const { error } = await supabase
        .from('companies')
        .update({ number_format_preferences: updated })
        .eq('id', user.profile.company_id);

      if (error) {
        console.error('Error saving number preferences:', error);
        // Revert to previous preferences on error
        setPreferences(preferences);
      }
    } catch (error) {
      console.error('Error saving number preferences:', error);
      // Revert to previous preferences on error
      setPreferences(preferences);
    }
  };

  return {
    preferences,
    updatePreferences,
    useArabicDigits: preferences.useArabicDigits || false,
    locale: preferences.locale || 'en-US',
    isLoading,
  };
};