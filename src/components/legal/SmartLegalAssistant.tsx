import React, { useState, useRef, useEffect } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Send, 
  Mic, 
  MicOff, 
  Upload, 
  Brain, 
  Zap, 
  Target, 
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share,
  Download,
  MoreHorizontal,
  Lightbulb,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useUnifiedLegalAI, UnifiedLegalQuery, UnifiedLegalResponse } from '@/hooks/useUnifiedLegalAI';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  metadata?: {
    classification?: any;
    processingType?: string;
    processingTime?: number;
    confidence?: number;
    adaptiveRecommendations?: string[];
  };
  reactions?: {
    helpful?: boolean;
    accurate?: boolean;
    bookmarked?: boolean;
  };
}

interface SmartSuggestion {
  text: string;
  type: 'follow_up' | 'clarification' | 'related_topic';
  confidence: number;
}

import { EnhancedSmartLegalAssistant } from './EnhancedSmartLegalAssistant';
import { EnhancedAIPanel } from '../ai/EnhancedAIPanel';

export const SmartLegalAssistant = () => {
  return (
    <div className="space-y-6">
      <EnhancedAIPanel />
      <EnhancedSmartLegalAssistant />
    </div>
  );
};