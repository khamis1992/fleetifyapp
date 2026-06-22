/**
 * Voice Commands Hook
 * Handles voice command parsing and execution
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VoiceLanguage } from '@/types/mobile';
import { parseVoiceCommand } from '@/utils/voiceInputHelpers';
import { toast } from 'sonner';

interface UseVoiceCommandsOptions {
  language?: VoiceLanguage;
  onCommandExecuted?: (command: string) => void;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const { language = 'ar-SA', onCommandExecuted } = options;
  const navigate = useNavigate();

  // Execute navigation command
  const executeNavigationCommand = useCallback(
    (route: string, label: string) => {
      navigate(route);
      toast.success(
        language === 'ar-SA'
          ? `تم الانتقال إلى ${label}`
          : `Navigated to ${label}`
      );
    },
    [navigate, language]
  );

  // Process voice command
  const processCommand = useCallback(
    (transcript: string): boolean => {
      const { command, params } = parseVoiceCommand(transcript, language);

      if (!command) {
        return false;
      }

      // Execute command based on type
      switch (command) {
        case 'navigate_dashboard':
          executeNavigationCommand('/', language === 'ar-SA' ? 'لوحة التحكم' : 'Dashboard');
          break;

        case 'navigate_contracts':
          executeNavigationCommand('/contracts', language === 'ar-SA' ? 'العقود' : 'Contracts');
          break;

        case 'navigate_customers':
          executeNavigationCommand('/customers', language === 'ar-SA' ? 'العملاء' : 'Customers');
          break;

        case 'navigate_fleet':
          executeNavigationCommand('/fleet', language === 'ar-SA' ? 'الأسطول' : 'Fleet');
          break;

        case 'navigate_finance':
          executeNavigationCommand('/finance', language === 'ar-SA' ? 'المالية' : 'Finance');
          break;

        case 'new_contract':
          // This would typically trigger a dialog/modal to create a contract
          toast.info(
            language === 'ar-SA'
              ? 'انتقل إلى صفحة العقود لإنشاء عقد جديد'
              : 'Navigate to Contracts page to create a new contract'
          );
          executeNavigationCommand('/contracts', language === 'ar-SA' ? 'العقود' : 'Contracts');
          break;

        case 'new_customer':
          // This would typically trigger a dialog/modal to create a customer
          toast.info(
            language === 'ar-SA'
              ? 'انتقل إلى صفحة العملاء لإضافة عميل جديد'
              : 'Navigate to Customers page to add a new customer'
          );
          executeNavigationCommand('/customers', language === 'ar-SA' ? 'العملاء' : 'Customers');
          break;

        case 'search':
          // This would typically trigger a search interface
          const searchQuery = params[0] || '';
          toast.info(
            language === 'ar-SA'
              ? `البحث عن: ${searchQuery}`
              : `Search for: ${searchQuery}`
          );
          // Could navigate to search page with query parameter
          // navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
          break;

        default:
          return false;
      }

      if (onCommandExecuted) {
        onCommandExecuted(command);
      }

      return true;
    },
    [language, navigate, executeNavigationCommand, onCommandExecuted]
  );

  // Get available commands
  const getAvailableCommands = useCallback((): string[] => {
    if (language === 'ar-SA') {
      return [
        'افتح لوحة التحكم',
        'اذهب إلى العقود',
        'اذهب إلى العملاء',
        'اذهب إلى الأسطول',
        'اذهب إلى المالية',
        'أضف عقد جديد',
        'أضف عميل جديد',
        'ابحث عن...',
      ];
    } else {
      return [
        'Open dashboard',
        'Go to contracts',
        'Go to customers',
        'Go to fleet',
        'Go to finance',
        'Add new contract',
        'Add new customer',
        'Search for...',
      ];
    }
  }, [language]);

  return {
    processCommand,
    getAvailableCommands,
  };
}
