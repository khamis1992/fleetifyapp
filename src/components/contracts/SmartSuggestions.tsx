import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Calendar, DollarSign, Car, AlertTriangle } from 'lucide-react';

interface SmartSuggestion {
  type: 'alternative_dates' | 'alternative_vehicle' | 'pricing_optimization' | 'duration_adjustment';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  data?: any;
}

interface SmartSuggestionsProps {
  suggestions: SmartSuggestion[];
  onApplySuggestion?: (suggestion: SmartSuggestion) => void;
}

const getSuggestionIcon = (type: SmartSuggestion['type']) => {
  switch (type) {
    case 'alternative_dates':
      return <Calendar className="h-4 w-4" />;
    case 'alternative_vehicle':
      return <Car className="h-4 w-4" />;
    case 'pricing_optimization':
      return <DollarSign className="h-4 w-4" />;
    case 'duration_adjustment':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: SmartSuggestion['priority']) => {
  switch (priority) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    case 'low':
      return 'secondary';
    default:
      return 'secondary';
  }
};

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  suggestions,
  onApplySuggestion
}) => {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
          <Lightbulb className="h-4 w-4" />
          اقتراحات ذكية ({suggestions.length})
        </CardTitle>
      </CardHeader>
    </Card>
  );
};