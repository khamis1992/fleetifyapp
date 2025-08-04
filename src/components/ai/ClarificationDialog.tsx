import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HelpCircle, MessageCircle, Brain, ChevronRight } from 'lucide-react';
import { ClarificationSession } from '@/hooks/useSelfLearningAI';

interface ClarificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  session: ClarificationSession | null;
  onSubmitResponses: (responses: Record<string, string>) => Promise<void>;
  isProcessing?: boolean;
}

export const ClarificationDialog: React.FC<ClarificationDialogProps> = ({
  isOpen,
  onClose,
  session,
  onSubmitResponses,
  isProcessing = false
}) => {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  if (!session) return null;

  const handleResponseChange = (questionIndex: number, response: string) => {
    setResponses(prev => ({
      ...prev,
      [questionIndex]: response
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < session.clarification_questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    await onSubmitResponses(responses);
    setResponses({});
    setCurrentQuestionIndex(0);
    onClose();
  };

  const isComplete = session.clarification_questions.every((_, index) => 
    responses[index] && responses[index].trim().length > 0
  );

  const progress = ((currentQuestionIndex + 1) / session.clarification_questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Clarification Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {currentQuestionIndex + 1} of {session.clarification_questions.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Original Query Context */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Original Query:</p>
                  <p className="text-sm mt-1">{session.original_query}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Question */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <p className="font-medium mb-2">
                  Question {currentQuestionIndex + 1}:
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {session.clarification_questions[currentQuestionIndex]}
                </p>
                
                <Textarea
                  placeholder="Please provide your response..."
                  value={responses[currentQuestionIndex] || ''}
                  onChange={(e) => handleResponseChange(currentQuestionIndex, e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>

          {/* Question Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>

            <div className="flex gap-1">
              {session.clarification_questions.map((_, index) => (
                <Badge
                  key={index}
                  variant={index === currentQuestionIndex ? "default" : "secondary"}
                  className={`w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs ${
                    responses[index] ? 'bg-green-500 text-white' : ''
                  }`}
                >
                  {index + 1}
                </Badge>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentQuestionIndex === session.clarification_questions.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Completion Status */}
          {isComplete && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <p className="text-sm text-green-700">
                  ✓ All questions answered! Ready to submit for processing.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isComplete || isProcessing}
            className="min-w-[100px]"
          >
            {isProcessing ? 'Processing...' : 'Submit Clarification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};