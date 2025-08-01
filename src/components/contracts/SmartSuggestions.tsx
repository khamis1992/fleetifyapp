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
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-3 bg-white border border-blue-200 rounded-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {getSuggestionIcon(suggestion.type)}
                  <span className="font-medium text-sm">{suggestion.title}</span>
                  <Badge 
                    variant={getPriorityColor(suggestion.priority)} 
                    className="text-xs"
                  >
                    {suggestion.priority === 'high' && 'مهم'}
                    {suggestion.priority === 'medium' && 'متوسط'}
                    {suggestion.priority === 'low' && 'منخفض'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {suggestion.description}
                </p>
                
                {/* Display suggestion data */}
                {suggestion.data && (
                  <div className="text-xs text-blue-700 space-y-1">
                    {suggestion.type === 'alternative_dates' && suggestion.data.alternatives && (
                      <div>
                        <p className="font-medium">البدائل المتاحة:</p>
                        {suggestion.data.alternatives.map((alt: any, i: number) => (
                          <div key={i} className="ml-2">
                            • {alt.start_date} إلى {alt.end_date} ({alt.availability} متاح)
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {suggestion.type === 'alternative_vehicle' && suggestion.data.vehicles && (
                      <div>
                        <p className="font-medium">المركبات البديلة:</p>
                        {suggestion.data.vehicles.map((vehicle: any, i: number) => (
                          <div key={i} className="ml-2">
                            • {vehicle.make} {vehicle.model} - {vehicle.plate_number}
                            {vehicle.daily_rate && ` (${vehicle.daily_rate} د.ك/يوم)`}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {suggestion.type === 'pricing_optimization' && suggestion.data.savings && (
                      <div>
                        <p className="font-medium text-green-600">
                          توفير محتمل: {suggestion.data.savings} د.ك
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {onApplySuggestion && suggestion.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplySuggestion(suggestion)}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {suggestion.action}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};