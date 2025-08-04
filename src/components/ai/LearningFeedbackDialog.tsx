import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Brain, MessageSquare, Lightbulb } from 'lucide-react';
import { LearningFeedback } from '@/hooks/useSelfLearningAI';

interface LearningFeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: Omit<LearningFeedback, 'id'>) => Promise<void>;
  queryData?: {
    query: string;
    response: string;
    intent: string;
    confidence: number;
  };
  isSubmitting?: boolean;
}

export const LearningFeedbackDialog: React.FC<LearningFeedbackDialogProps> = ({
  isOpen,
  onClose,
  onSubmitFeedback,
  queryData,
  isSubmitting = false
}) => {
  const [feedbackType, setFeedbackType] = useState<'helpful' | 'accurate' | 'improvement_needed'>('helpful');
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const handleSubmit = async () => {
    const feedback: Omit<LearningFeedback, 'id'> = {
      feedback_type: feedbackType,
      feedback_rating: rating,
      feedback_comments: comments.trim() || undefined,
      improvement_suggestions: suggestions.trim() ? { general: suggestions } : {}
    };

    await onSubmitFeedback(feedback);
    
    // Reset form
    setFeedbackType('helpful');
    setRating(5);
    setComments('');
    setSuggestions('');
    onClose();
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <Star
          key={index}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            starValue <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
          onClick={() => setRating(starValue)}
        />
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Help Improve AI Learning
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Query Context */}
          {queryData && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Your Query & AI Response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Query:</p>
                  <p className="text-sm">{queryData.query}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">AI Response:</p>
                  <p className="text-sm">{queryData.response}</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <Badge variant="outline">
                    Intent: {queryData.intent}
                  </Badge>
                  <Badge variant="outline">
                    Confidence: {Math.round(queryData.confidence * 100)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How would you rate this interaction?</Label>
            <RadioGroup value={feedbackType} onValueChange={(value: any) => setFeedbackType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="helpful" id="helpful" />
                <Label htmlFor="helpful" className="text-sm">
                  Helpful - The AI understood and responded appropriately
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accurate" id="accurate" />
                <Label htmlFor="accurate" className="text-sm">
                  Accurate - The information provided was correct
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="improvement_needed" id="improvement_needed" />
                <Label htmlFor="improvement_needed" className="text-sm">
                  Needs Improvement - The response could be better
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Overall Rating</Label>
            <div className="flex items-center gap-1">
              {renderStars()}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating} of 5 stars
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <Label htmlFor="comments" className="text-sm font-medium">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              placeholder="Share your thoughts about this AI interaction..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Improvement Suggestions */}
          {feedbackType === 'improvement_needed' && (
            <div className="space-y-3">
              <Label htmlFor="suggestions" className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                How can we improve?
              </Label>
              <Textarea
                id="suggestions"
                placeholder="Please describe what could be improved or what the AI should have done differently..."
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Benefits Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-700">
                💡 Your feedback helps the AI learn and improve its responses for future interactions. 
                This makes the system smarter and more helpful for everyone.
              </p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};