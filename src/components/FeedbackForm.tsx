/**
 * User Feedback Form Component
 * Collects detailed feedback for test results to improve the system
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAdaptiveLearning } from '@/utils/adaptiveLearningPipeline';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface TestResult {
  test_case_id: string;
  ocr_result: any;
  matching_result: any;
  accuracy_scores: {
    customer_name_accuracy: number;
    amount_accuracy: number;
    car_number_accuracy: number;
    overall_accuracy: number;
  };
  processing_time: number;
  confidence_score: number;
  errors?: string[];
  tested_at: string;
}

interface FeedbackFormProps {
  testResult: TestResult;
  onSubmitFeedback: (feedback: {
    user_rating: 1 | 2 | 3 | 4 | 5;
    is_correct: boolean;
    corrections?: {
      customer_name?: string;
      amount?: number;
      car_number?: string;
    };
    feedback_notes?: string;
  }) => void;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ testResult, onSubmitFeedback }) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showCorrections, setShowCorrections] = useState(false);
  const [corrections, setCorrections] = useState({
    customer_name: '',
    amount: '',
    car_number: ''
  });
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const { addLearningData, recommendAction } = useAdaptiveLearning();

  const handleRatingClick = (value: 1 | 2 | 3 | 4 | 5) => {
    setRating(value);
  };

  // Get AI recommendation for this result
  const aiRecommendation = recommendAction(testResult.accuracy_scores.overall_accuracy);

  const handleSubmit = () => {
    const feedback = {
      user_rating: rating,
      is_correct: isCorrect ?? false,
      corrections: showCorrections ? {
        customer_name: corrections.customer_name || undefined,
        amount: corrections.amount ? parseFloat(corrections.amount) : undefined,
        car_number: corrections.car_number || undefined
      } : undefined,
      feedback_notes: feedbackNotes || undefined
    };

    // Add to adaptive learning pipeline
    addLearningData({
      invoice_text: testResult.ocr_result?.data?.raw_text || '',
      extracted_data: testResult.ocr_result?.data || {},
      user_corrections: feedback.corrections || {},
      confidence_scores: {
        ocr_confidence: testResult.confidence_score,
        matching_confidence: testResult.matching_result?.total_confidence || 0,
        overall_confidence: testResult.accuracy_scores.overall_accuracy
      },
      feedback_rating: rating,
      is_correct: isCorrect ?? false,
      processing_time: testResult.processing_time
    });

    onSubmitFeedback(feedback);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">تم حفظ تقييمكم بنجاح!</span>
        </div>
        <p className="text-sm text-green-700 mt-1">
          شكراً لكم على المساهمة في تحسين النظام
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendation Banner */}
      <div className={`p-3 rounded-lg border ${
        aiRecommendation.confidence_level === 'high' 
          ? 'bg-green-50 border-green-200' 
          : aiRecommendation.confidence_level === 'medium'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">🤖 توصية الذكاء الاصطناعي:</span>
          <Badge variant={aiRecommendation.action === 'auto_approve' ? 'default' : aiRecommendation.action === 'manual_review' ? 'secondary' : 'destructive'}>
            {aiRecommendation.action === 'auto_approve' && 'موافقة تلقائية'}
            {aiRecommendation.action === 'manual_review' && 'مراجعة يدوية'}
            {aiRecommendation.action === 'reject' && 'رفض'}
          </Badge>
        </div>
        <p className="text-xs text-gray-600">{aiRecommendation.reason}</p>
      </div>
      {/* Extracted Data Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium mb-3">البيانات المستخرجة:</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">اسم العميل:</span>
            <p className="mt-1">{testResult.ocr_result?.data?.customer_name || 'غير محدد'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">المبلغ:</span>
            <p className="mt-1">{testResult.ocr_result?.data?.total_amount || 'غير محدد'}</p>
          </div>
          <div>
            <span className="font-medium text-gray-600">رقم المركبة:</span>
            <p className="mt-1">{testResult.ocr_result?.data?.car_number || 'غير محدد'}</p>
          </div>
        </div>
      </div>

      {/* Rating Section */}
      <div>
        <Label className="text-base font-medium">تقييم عام للنتيجة:</Label>
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRatingClick(value as 1 | 2 | 3 | 4 | 5)}
              className={`p-1 rounded transition-colors ${
                value <= rating 
                  ? 'text-yellow-500 hover:text-yellow-600' 
                  : 'text-gray-300 hover:text-gray-400'
              }`}
            >
              <Star className="h-6 w-6 fill-current" />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">
            {rating === 5 && 'ممتاز'}
            {rating === 4 && 'جيد جداً'}
            {rating === 3 && 'جيد'}
            {rating === 2 && 'مقبول'}
            {rating === 1 && 'يحتاج تحسين'}
          </span>
        </div>
      </div>

      <Separator />

      {/* Correctness Assessment */}
      <div>
        <Label className="text-base font-medium">هل النتيجة صحيحة؟</Label>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => {
              setIsCorrect(true);
              setShowCorrections(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isCorrect === true 
                ? 'bg-green-100 border-green-300 text-green-800' 
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ThumbsUp className="h-4 w-4" />
            نعم، صحيحة
          </button>
          <button
            onClick={() => {
              setIsCorrect(false);
              setShowCorrections(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isCorrect === false 
                ? 'bg-red-100 border-red-300 text-red-800' 
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ThumbsDown className="h-4 w-4" />
            لا، تحتاج تصحيح
          </button>
        </div>
      </div>

      {/* Corrections Section */}
      {showCorrections && (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <Edit3 className="h-4 w-4 text-yellow-600" />
            <Label className="font-medium text-yellow-800">التصحيحات المطلوبة:</Label>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">اسم العميل الصحيح:</Label>
              <Input
                value={corrections.customer_name}
                onChange={(e) => setCorrections(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="أدخل اسم العميل الصحيح"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">المبلغ الصحيح:</Label>
              <Input
                type="number"
                step="0.01"
                value={corrections.amount}
                onChange={(e) => setCorrections(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="أدخل المبلغ الصحيح"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">رقم المركبة الصحيح:</Label>
              <Input
                value={corrections.car_number}
                onChange={(e) => setCorrections(prev => ({ ...prev, car_number: e.target.value }))}
                placeholder="أدخل رقم المركبة الصحيح"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Additional Notes */}
      <div>
        <Label className="text-base font-medium">ملاحظات إضافية (اختيارية):</Label>
        <Textarea
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          placeholder="أي ملاحظات أو اقتراحات لتحسين النظام..."
          className="mt-2 h-20"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={isCorrect === null}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          حفظ التقييم
        </Button>
      </div>

      {/* Performance Indicators */}
      <div className="bg-blue-50 p-3 rounded-lg">
        <h6 className="font-medium text-blue-800 mb-2">معلومات الأداء:</h6>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-blue-600">وقت المعالجة:</span>
            <div className="font-medium">{testResult.processing_time}ms</div>
          </div>
          <div>
            <span className="text-blue-600">مستوى الثقة:</span>
            <div className="font-medium">{testResult.confidence_score}%</div>
          </div>
          <div>
            <span className="text-blue-600">دقة الاسم:</span>
            <div className="font-medium">{testResult.accuracy_scores.customer_name_accuracy}%</div>
          </div>
          <div>
            <span className="text-blue-600">الدقة الإجمالية:</span>
            <div className="font-medium">{testResult.accuracy_scores.overall_accuracy}%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackForm;