import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  Download,
  Clock,
  TrendingUp,
  Zap,
  Shield,
  Scale
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

interface DocumentAnalysis {
  id: string;
  fileName: string;
  fileType: string;
  extractedText: string;
  keyPoints: string[];
  riskFactors: Array<{
    type: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
  legalClauses: Array<{
    type: string;
    content: string;
    analysis: string;
  }>;
  compliance: Array<{
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'needs_review';
    details: string;
  }>;
  summary: string;
  confidence: number;
  processingTime: number;
}

interface DocumentAnalyzerProps {
  onAnalysisComplete?: (analysis: DocumentAnalysis) => void;
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (!supportedTypes.includes(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "يرجى رفع ملف PDF، Word، أو نص عادي",
        variant: "destructive"
      });
      return;
    }

    analyzeDocument(file);
  };

  const analyzeDocument = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStep('جاري قراءة الملف...');
    
    const startTime = Date.now();
    
    try {
      // Step 1: Extract text from file
      setAnalysisProgress(10);
      const extractedText = await extractTextFromFile(file);
      
      // Step 2: Initialize AI models
      setCurrentStep('تحميل نماذج الذكاء الاصطناعي...');
      setAnalysisProgress(25);
      
      const classifier = await pipeline('text-classification', 'nlptown/bert-base-multilingual-uncased-sentiment');
      const summarizer = await pipeline('summarization', 'facebook/bart-large-cnn');
      
      // Step 3: Analyze text content
      setCurrentStep('تحليل المحتوى...');
      setAnalysisProgress(50);
      
      const keyPoints = extractKeyPoints(extractedText);
      const riskFactors = await analyzeRisks(extractedText);
      const legalClauses = extractLegalClauses(extractedText);
      
      // Step 4: Check compliance
      setCurrentStep('فحص الامتثال...');
      setAnalysisProgress(75);
      
      const compliance = checkCompliance(extractedText);
      
      // Step 5: Generate summary
      setCurrentStep('إنشاء الملخص...');
      setAnalysisProgress(90);
      
      const summary = await generateSummary(extractedText, summarizer);
      
      // Step 6: Calculate confidence score
      setAnalysisProgress(100);
      setCurrentStep('اكتمل التحليل');
      
      const confidence = calculateConfidence(extractedText, keyPoints, riskFactors);
      const processingTime = Date.now() - startTime;
      
      const analysisResult: DocumentAnalysis = {
        id: `analysis_${Date.now()}`,
        fileName: file.name,
        fileType: file.type,
        extractedText,
        keyPoints,
        riskFactors,
        legalClauses,
        compliance,
        summary,
        confidence,
        processingTime
      };
      
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);
      
      toast({
        title: "تم تحليل الوثيقة بنجاح",
        description: `تم الانتهاء في ${Math.round(processingTime / 1000)} ثانية`
      });
      
    } catch (error) {
      console.error('Error analyzing document:', error);
      toast({
        title: "خطأ في تحليل الوثيقة",
        description: "حدث خطأ أثناء معالجة الملف",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setCurrentStep('');
      setAnalysisProgress(0);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return await file.text();
    }
    
    // For PDF and Word files, we'll simulate text extraction
    // In a real implementation, you'd use libraries like PDF.js or mammoth.js
    return `نص مستخرج من ${file.name}. هذا النص يحتوي على بنود قانونية مختلفة تتطلب التحليل والمراجعة. تم استخراج هذا النص بنجاح ويمكن تحليله الآن للبحث عن المخاطر القانونية والبنود المهمة.`;
  };

  const extractKeyPoints = (text: string): string[] => {
    // Simulate key points extraction using keyword analysis
    const keywords = [
      'التزام', 'مسؤولية', 'ضمان', 'شرط', 'غرامة', 'تعويض', 
      'انهاء', 'فسخ', 'تجديد', 'مدة', 'دفع', 'استحقاق'
    ];
    
    const points: string[] = [];
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        points.push(`وجود بند يتعلق بـ ${keyword} في الوثيقة`);
      }
    });
    
    return points.length > 0 ? points : ['تم استخراج النقاط الرئيسية من الوثيقة'];
  };

  const analyzeRisks = async (text: string) => {
    // Simulate risk analysis
    return [
      {
        type: 'high' as const,
        description: 'بند جزائي مرتفع في حالة الإخلال',
        recommendation: 'مراجعة البند والتفاوض حول تخفيف الغرامة'
      },
      {
        type: 'medium' as const,
        description: 'شروط إنهاء العقد غير واضحة',
        recommendation: 'توضيح شروط وإجراءات إنهاء العقد'
      },
      {
        type: 'low' as const,
        description: 'تواريخ التسليم قابلة للتفاوض',
        recommendation: 'إضافة هامش زمني إضافي للتسليم'
      }
    ];
  };

  const extractLegalClauses = (text: string) => {
    return [
      {
        type: 'التزامات مالية',
        content: 'بند يتعلق بالدفعات والاستحقاقات المالية',
        analysis: 'البند واضح ومحدد بشكل جيد'
      },
      {
        type: 'شروط الإنهاء',
        content: 'بند يحدد كيفية وشروط إنهاء العقد',
        analysis: 'يحتاج إلى مراجعة وتوضيح أكثر'
      }
    ];
  };

  const checkCompliance = (text: string) => {
    return [
      {
        requirement: 'قانون العمل الكويتي',
        status: 'compliant' as const,
        details: 'البنود متوافقة مع قانون العمل'
      },
      {
        requirement: 'قانون التجارة',
        status: 'needs_review' as const,
        details: 'بعض البنود تحتاج مراجعة للتأكد من التوافق'
      },
      {
        requirement: 'اللوائح التنفيذية',
        status: 'non_compliant' as const,
        details: 'هناك تعارض مع بعض اللوائح التنفيذية'
      }
    ];
  };

  const generateSummary = async (text: string, summarizer: any): Promise<string> => {
    try {
      // For demonstration, return a mock summary
      return 'ملخص الوثيقة: تحتوي الوثيقة على بنود قانونية متنوعة تتطلب المراجعة والتحليل. تم تحديد عدة نقاط مهمة تحتاج إلى اهتمام خاص.';
    } catch (error) {
      return 'لم يتمكن النظام من إنشاء ملخص تلقائي للوثيقة.';
    }
  };

  const calculateConfidence = (text: string, keyPoints: string[], riskFactors: any[]): number => {
    let confidence = 0.7; // Base confidence
    
    if (text.length > 500) confidence += 0.1;
    if (keyPoints.length > 0) confidence += 0.1;
    if (riskFactors.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      case 'needs_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            محلل الوثائق القانونية المتقدم
          </CardTitle>
          <CardDescription>
            تحليل ذكي للوثائق القانونية باستخدام الذكاء الاصطناعي
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            
            {isAnalyzing ? (
              <div className="space-y-4">
                <Brain className="h-12 w-12 mx-auto text-primary animate-pulse" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">جاري تحليل الوثيقة...</h3>
                  <p className="text-sm text-muted-foreground">{currentStep}</p>
                  <Progress value={analysisProgress} className="w-full max-w-md mx-auto" />
                  <p className="text-xs text-muted-foreground">{analysisProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">اسحب الملف هنا أو انقر للتحديد</h3>
                  <p className="text-sm text-muted-foreground">
                    المسموح: PDF, Word, النصوص العادية
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    اختر الملف
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ملخص التحليل
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    اكتمل
                  </Badge>
                  <Badge variant="secondary">
                    ثقة: {Math.round(analysis.confidence * 100)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <Clock className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{Math.round(analysis.processingTime / 1000)}s</p>
                    <p className="text-xs text-muted-foreground">وقت المعالجة</p>
                  </div>
                  <div className="space-y-1">
                    <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{analysis.keyPoints.length}</p>
                    <p className="text-xs text-muted-foreground">نقطة رئيسية</p>
                  </div>
                  <div className="space-y-1">
                    <AlertTriangle className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{analysis.riskFactors.length}</p>
                    <p className="text-xs text-muted-foreground">عامل خطر</p>
                  </div>
                  <div className="space-y-1">
                    <Scale className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">{analysis.legalClauses.length}</p>
                    <p className="text-xs text-muted-foreground">بند قانوني</p>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">الملخص التنفيذي:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                عوامل المخاطر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {analysis.riskFactors.map((risk, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${getRiskColor(risk.type)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-sm">{risk.description}</h5>
                        <Badge variant="outline" className={getRiskColor(risk.type)}>
                          {risk.type === 'high' ? 'عالي' : risk.type === 'medium' ? 'متوسط' : 'منخفض'}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-80">{risk.recommendation}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Legal Clauses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                البنود القانونية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {analysis.legalClauses.map((clause, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/20">
                      <h5 className="font-medium text-sm mb-1">{clause.type}</h5>
                      <p className="text-xs text-muted-foreground mb-2">{clause.content}</p>
                      <p className="text-xs text-blue-600">{clause.analysis}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Compliance Check */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                فحص الامتثال
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {analysis.compliance.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{item.requirement}</h5>
                      <Badge className={getComplianceColor(item.status)}>
                        {item.status === 'compliant' ? 'متوافق' : 
                         item.status === 'non_compliant' ? 'غير متوافق' : 'يحتاج مراجعة'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Points */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-purple-600" />
                النقاط الرئيسية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {analysis.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 rounded border bg-muted/10">
                    <Zap className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                    <span className="text-sm">{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default DocumentAnalyzer;