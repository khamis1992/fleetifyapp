/**
 * AI Field Suggestions Component
 * Provides intelligent suggestions for form fields using GLM
 */

import { useState, useEffect } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface AIFieldSuggestionsProps {
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'date' | 'number' | 'textarea' | 'select';
  currentValue?: any;
  onApplySuggestion: (value: any) => void;
  context?: {
    documentType?: string;
    companyId?: string;
    customerId?: string;
  };
}

export function AIFieldSuggestions({ 
  fieldName, 
  fieldLabel, 
  fieldType,
  currentValue,
  onApplySuggestion,
  context 
}: AIFieldSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * Generate suggestions using GLM
   */
  const generateSuggestions = async () => {
    setIsLoading(true);
    setShowSuggestions(true);

    try {
      // Import glmService dynamically to avoid circular dependency
      const { glmService } = await import('@/services/ai/GLMService');
      
      const response = await glmService.suggestFieldValues(
        context?.documentType || 'document',
        context || {}
      );

      if (response.success && response.content) {
        try {
          const parsed = JSON.parse(response.content);
          setSuggestions(parsed.suggestions || []);
        } catch {
          setSuggestions([response.content]);
        }
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Auto-generate suggestions when field changes
   */
  useEffect(() => {
    if (currentValue && showSuggestions) {
      // Regenerate suggestions when current value changes
      generateSuggestions();
    }
  }, [currentValue]);

  /**
   * Handle suggestion selection
   */
  const handleApplySuggestion = (suggestion: string) => {
    // Parse the suggestion based on field type
    let parsedValue: any = suggestion;

    switch (fieldType) {
      case 'number':
        parsedValue = parseFloat(suggestion.replace(/[^0-9.-]/g, ''));
        break;
      case 'date':
        parsedValue = new Date(suggestion);
        break;
      default:
        parsedValue = suggestion;
    }

    onApplySuggestion(parsedValue);
    setShowSuggestions(false);
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : 0
        );
        break;
      case 'Enter':
        if (suggestions[selectedIndex]) {
          handleApplySuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  return (
    <div className="relative">
      {/* Suggestion Button */}
      <div className="absolute -left-2 top-0 z-10">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={generateSuggestions}
          disabled={isLoading}
          className={`h-8 w-8 rounded-full p-0 ${
            suggestions.length > 0 
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
              : 'bg-muted hover:bg-muted/80'
          }`}
          title="اقتراح قيم ذكية"
        >
          {isLoading ? (
            <Sparkles className="h-4 w-4 animate-pulse" />
          ) : suggestions.length > 0 ? (
            <Lightbulb className="h-4 w-4" />
          ) : null}
        </Button>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute -left-2 top-10 z-20 w-80"
            >
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-border overflow-hidden">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        اقتراحات ذكية
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      GLM
                    </Badge>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleApplySuggestion(suggestion)}
                      className={`w-full text-right px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors text-left ${
                        index === selectedIndex 
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100' 
                          : 'text-foreground'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

