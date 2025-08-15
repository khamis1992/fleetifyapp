import { useState, useEffect } from "react";
import { getNumberPreferences, NumberFormatOptions } from "@/utils/numberFormatter";

/**
 * Hook لإدارة تفضيلات تنسيق الأرقام للشركة
 */
export const useNumberPreferences = () => {
  const [preferences, setPreferences] = useState<NumberFormatOptions>(getNumberPreferences());

  // TODO: ربط بقاعدة البيانات لجلب إعدادات الشركة
  useEffect(() => {
    // هنا سيتم جلب الإعدادات من قاعدة البيانات
    // const fetchPreferences = async () => {
    //   try {
    //     const companyPreferences = await supabase
    //       .from('companies')
    //       .select('number_format_preferences')
    //       .single();
    //     
    //     if (companyPreferences.data?.number_format_preferences) {
    //       setPreferences(companyPreferences.data.number_format_preferences);
    //     }
    //   } catch (error) {
    //     console.error('Error fetching number preferences:', error);
    //   }
    // };
    
    // fetchPreferences();
  }, []);

  const updatePreferences = (newPreferences: Partial<NumberFormatOptions>) => {
    const updated = { ...preferences, ...newPreferences };
    setPreferences(updated);
    
    // TODO: حفظ الإعدادات في قاعدة البيانات
    // const savePreferences = async () => {
    //   try {
    //     await supabase
    //       .from('companies')
    //       .update({ number_format_preferences: updated })
    //       .eq('id', companyId);
    //   } catch (error) {
    //     console.error('Error saving number preferences:', error);
    //   }
    // };
    
    // savePreferences();
  };

  return {
    preferences,
    updatePreferences,
    useArabicDigits: preferences.useArabicDigits || false,
    locale: preferences.locale || 'en-US',
  };
};