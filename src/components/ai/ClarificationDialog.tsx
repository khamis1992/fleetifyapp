import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle, 
  MessageCircle, 
  Brain, 
  ChevronRight, 
  ChevronLeft,
  Target,
  Lightbulb,
  CheckCircle,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
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
  const [responses, setResponses] = React.useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [analysisInsights, setAnalysisInsights] = React.useState<any>(null);
  const [responseQuality, setResponseQuality] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    if (session?.metadata) {
      setAnalysisInsights(session.metadata);
    }
  }, [session]);

  React.useEffect(() => {
    // Analyze response quality in real-time
    Object.keys(responses).forEach(questionIndex => {
      const response = responses[questionIndex];
      if (response && response.trim().length > 0) {
        const quality = calculateResponseQuality(response);
        setResponseQuality(prev => ({
          ...prev,
          [questionIndex]: quality
        }));
      }
    });
  }, [responses]);

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
    setResponseQuality({});
    onClose();
  };

  const calculateResponseQuality = (response: string): number => {
    let quality = 0;
    
    // Length factor
    if (response.length > 10) quality += 0.3;
    if (response.length > 30) quality += 0.2;
    
    // Content factors
    if (response.includes('نعم') || response.includes('لا')) quality += 0.2;
    if (/\d/.test(response)) quality += 0.2; // Contains numbers
    if (response.split(' ').length > 3) quality += 0.1; // Multiple words
    
    return Math.min(1, quality);
  };

  const isComplete = session.clarification_questions.every((_, index) => 
    responses[index] && responses[index].trim().length > 0
  );

  const overallQuality = Object.values(responseQuality).length > 0 
    ? Object.values(responseQuality).reduce((sum, quality) => sum + quality, 0) / Object.values(responseQuality).length
    : 0;

  const progress = ((currentQuestionIndex + 1) / session.clarification_questions.length) * 100;
  const completionRate = (Object.keys(responses).filter(key => responses[key]?.trim()).length / session.clarification_questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            نظام الاستيضاح الذكي
            <Badge variant="secondary" className="mr-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              تعلم تكيفي
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Intelligence Insights Panel */}
          {analysisInsights && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 mb-2">رؤى النظام الذكي</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {analysisInsights.query_analysis && (
                        <div>
                          <span className="text-blue-700 font-medium">مستوى التعقيد:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(analysisInsights.query_analysis.complexity || 3) * 20}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {analysisInsights.query_analysis.complexity || 3}/5
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {analysisInsights.estimated_resolution_confidence && (
                        <div>
                          <span className="text-blue-700 font-medium">توقع دقة الحل:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-700">
                              {Math.round(analysisInsights.estimated_resolution_confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {analysisInsights.question_generation_strategy && (
                      <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                        <span className="text-xs text-blue-800 font-medium">
                          استراتيجية الأسئلة: {analysisInsights.question_generation_strategy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress Indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">التقدم</span>
                <span className="font-medium">
                  {currentQuestionIndex + 1} من {session.clarification_questions.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">جودة الإجابات</span>
                <span className="font-medium flex items-center gap-1">
                  {overallQuality > 0.7 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : overallQuality > 0.4 ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  )}
                  {Math.round(overallQuality * 100)}%
                </span>
              </div>
              <Progress 
                value={overallQuality * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Original Query Context */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الاستعلام الأصلي:</p>
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
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    السؤال {currentQuestionIndex + 1}:
                  </p>
                  
                  {responseQuality[currentQuestionIndex] && (
                    <Badge 
                      variant={responseQuality[currentQuestionIndex] > 0.7 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      جودة الإجابة: {Math.round(responseQuality[currentQuestionIndex] * 100)}%
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {session.clarification_questions[currentQuestionIndex]}
                </p>
                
                <Textarea
                  placeholder="يرجى تقديم إجابة مفصلة ومحددة..."
                  value={responses[currentQuestionIndex] || ''}
                  onChange={(e) => handleResponseChange(currentQuestionIndex, e.target.value)}
                  className="min-h-[100px]"
                  dir="rtl"
                />
                
                {responses[currentQuestionIndex] && responseQuality[currentQuestionIndex] && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {responseQuality[currentQuestionIndex] > 0.7 ? (
                      <span className="text-green-600">✓ إجابة ممتازة</span>
                    ) : responseQuality[currentQuestionIndex] > 0.4 ? (
                      <span className="text-yellow-600">⚡ يمكن تحسين الإجابة بمزيد من التفاصيل</span>
                    ) : (
                      <span className="text-red-600">⚠ تحتاج إجابة أكثر تفصيلاً</span>
                    )}
                  </div>
                )}
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
              <ChevronLeft className="h-4 w-4 mr-1" />
              السابق
            </Button>

            <div className="flex gap-1">
              {session.clarification_questions.map((_, index) => (
                <Badge
                  key={index}
                  variant={index === currentQuestionIndex ? "default" : "secondary"}
                  className={`w-8 h-8 rounded-full p-0 flex items-center justify-center text-xs cursor-pointer ${
                    responses[index] ? 'bg-green-500 text-white hover:bg-green-600' : ''
                  }`}
                  onClick={() => setCurrentQuestionIndex(index)}
                >
                  {responses[index] ? '✓' : index + 1}
                </Badge>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={currentQuestionIndex === session.clarification_questions.length - 1}
            >
              التالي
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Completion Status */}
          {isComplete && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-green-700 font-medium">
                      ✓ تم الإجابة على جميع الأسئلة!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      جودة الإجابات الإجمالية: {Math.round(overallQuality * 100)}%
                      {overallQuality > 0.8 && " - ممتاز!"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="my-4" />

        <DialogFooter className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            💡 إجاباتك تساعد الذكاء الاصطناعي على التعلم وتحسين أدائه
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  معالجة...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  إرسال الاستيضاح
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};