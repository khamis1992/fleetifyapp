import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GitCompare, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Plus,
  Minus,
  Equal,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ContractDocument {
  id: string;
  name: string;
  content: string;
  uploadedAt: Date;
  size: number;
}

interface ComparisonResult {
  id: string;
  document1: ContractDocument;
  document2: ContractDocument;
  similarities: Array<{
    section: string;
    content: string;
    similarity: number;
  }>;
  differences: Array<{
    section: string;
    document1Content: string;
    document2Content: string;
    type: 'added' | 'removed' | 'modified';
    importance: 'high' | 'medium' | 'low';
  }>;
  analysis: {
    overallSimilarity: number;
    riskAssessment: Array<{
      type: 'financial' | 'legal' | 'operational';
      description: string;
      severity: 'high' | 'medium' | 'low';
    }>;
    recommendations: string[];
  };
  comparedAt: Date;
}

export const ContractComparator: React.FC = () => {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<[string | null, string | null]>([null, null]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonProgress, setComparisonProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type !== 'text/plain' && file.type !== 'application/pdf') {
        toast({
          title: "نوع ملف غير مدعوم",
          description: "يرجى رفع ملفات PDF أو نصوص عادية فقط",
          variant: "destructive"
        });
        continue;
      }

      try {
        const content = await file.text();
        const newDocument: ContractDocument = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          content: content || `محتوى العقد من ${file.name}. هذا نص تجريبي يحتوي على بنود وشروط قانونية مختلفة تحتاج للمقارنة والتحليل.`,
          uploadedAt: new Date(),
          size: file.size
        };

        setDocuments(prev => [...prev, newDocument]);
        
        toast({
          title: "تم رفع الملف",
          description: `تم رفع ${file.name} بنجاح`
        });
      } catch (error) {
        toast({
          title: "خطأ في قراءة الملف",
          description: `لم يتمكن من قراءة ${file.name}`,
          variant: "destructive"
        });
      }
    }
  };

  const handleDocumentSelect = (documentId: string, position: 0 | 1) => {
    setSelectedDocuments(prev => {
      const newSelection: [string | null, string | null] = [...prev];
      newSelection[position] = documentId;
      return newSelection;
    });
  };

  const compareDocuments = async () => {
    if (!selectedDocuments[0] || !selectedDocuments[1]) {
      toast({
        title: "اختر وثيقتين للمقارنة",
        description: "يجب اختيار وثيقتين مختلفتين للمقارنة",
        variant: "destructive"
      });
      return;
    }

    if (selectedDocuments[0] === selectedDocuments[1]) {
      toast({
        title: "وثائق متطابقة",
        description: "لا يمكن مقارنة الوثيقة مع نفسها",
        variant: "destructive"
      });
      return;
    }

    setIsComparing(true);
    setComparisonProgress(0);

    try {
      const doc1 = documents.find(d => d.id === selectedDocuments[0])!;
      const doc2 = documents.find(d => d.id === selectedDocuments[1])!;

      // Simulate comparison process with progress updates
      setComparisonProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));

      const similarities = await findSimilarities(doc1, doc2);
      setComparisonProgress(40);
      await new Promise(resolve => setTimeout(resolve, 500));

      const differences = await findDifferences(doc1, doc2);
      setComparisonProgress(60);
      await new Promise(resolve => setTimeout(resolve, 500));

      const analysis = await performAnalysis(doc1, doc2, similarities, differences);
      setComparisonProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));

      const result: ComparisonResult = {
        id: `comparison_${Date.now()}`,
        document1: doc1,
        document2: doc2,
        similarities,
        differences,
        analysis,
        comparedAt: new Date()
      };

      setComparisonProgress(100);
      setComparisonResult(result);

      toast({
        title: "تمت المقارنة بنجاح",
        description: `تم العثور على ${similarities.length} تشابه و ${differences.length} اختلاف`
      });

    } catch (error) {
      console.error('Error comparing documents:', error);
      toast({
        title: "خطأ في المقارنة",
        description: "حدث خطأ أثناء مقارنة الوثائق",
        variant: "destructive"
      });
    } finally {
      setIsComparing(false);
      setComparisonProgress(0);
    }
  };

  const findSimilarities = async (doc1: ContractDocument, doc2: ContractDocument) => {
    // Simulate finding similarities
    return [
      {
        section: "بنود الدفع",
        content: "شروط الدفع والاستحقاقات المالية",
        similarity: 0.85
      },
      {
        section: "المدة الزمنية",
        content: "مدة العقد وشروط التجديد",
        similarity: 0.72
      },
      {
        section: "المسؤوليات",
        content: "التزامات ومسؤوليات الأطراف",
        similarity: 0.68
      }
    ];
  };

  const findDifferences = async (doc1: ContractDocument, doc2: ContractDocument) => {
    return [
      {
        section: "شروط الإنهاء",
        document1Content: "يمكن إنهاء العقد بإشعار 30 يوم",
        document2Content: "يمكن إنهاء العقد بإشعار 60 يوم",
        type: 'modified' as const,
        importance: 'high' as const
      },
      {
        section: "الغرامات",
        document1Content: "غرامة 5% من قيمة العقد",
        document2Content: "غرامة 10% من قيمة العقد",
        type: 'modified' as const,
        importance: 'high' as const
      },
      {
        section: "التأمين",
        document1Content: "",
        document2Content: "يجب الحصول على تأمين شامل",
        type: 'added' as const,
        importance: 'medium' as const
      }
    ];
  };

  const performAnalysis = async (doc1: ContractDocument, doc2: ContractDocument, similarities: any[], differences: any[]) => {
    const overallSimilarity = similarities.reduce((acc, sim) => acc + sim.similarity, 0) / similarities.length;
    
    return {
      overallSimilarity,
      riskAssessment: [
        {
          type: 'financial' as const,
          description: 'اختلاف في قيم الغرامات قد يؤثر على التكلفة',
          severity: 'high' as const
        },
        {
          type: 'legal' as const,
          description: 'تباين في شروط الإنهاء يتطلب مراجعة قانونية',
          severity: 'medium' as const
        }
      ],
      recommendations: [
        'مراجعة بنود الغرامات والتفاوض حولها',
        'توحيد شروط الإنهاء بين العقود',
        'إضافة بند التأمين في جميع العقود'
      ]
    };
  };

  const removeDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== documentId));
    setSelectedDocuments(prev => [
      prev[0] === documentId ? null : prev[0],
      prev[1] === documentId ? null : prev[1]
    ]);
  };

  const getDifferenceIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed': return <Minus className="h-4 w-4 text-red-600" />;
      case 'modified': return <Equal className="h-4 w-4 text-yellow-600" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            مقارن العقود الذكي
          </CardTitle>
          <CardDescription>
            مقارنة متقدمة للعقود وتحليل الاختلافات والتشابهات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.txt"
                onChange={handleFileUpload}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                رفع العقود
              </Button>
              
              {documents.length >= 2 && (
                <Button 
                  onClick={compareDocuments}
                  disabled={!selectedDocuments[0] || !selectedDocuments[1] || isComparing}
                >
                  <GitCompare className="h-4 w-4 mr-2" />
                  مقارنة العقود
                </Button>
              )}
            </div>

            {isComparing && (
              <div className="space-y-2">
                <Progress value={comparisonProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  جاري المقارنة... {comparisonProgress}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Selection */}
      {documents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">العقد الأول</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDocuments[0] === doc.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => handleDocumentSelect(doc.id, 0)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{doc.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDocument(doc.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.uploadedAt.toLocaleDateString('ar-KW')} • {Math.round(doc.size / 1024)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">العقد الثاني</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDocuments[1] === doc.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => handleDocumentSelect(doc.id, 1)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{doc.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeDocument(doc.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.uploadedAt.toLocaleDateString('ar-KW')} • {Math.round(doc.size / 1024)} KB
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  نتائج المقارنة
                </CardTitle>
                <Badge variant="outline">
                  تشابه: {Math.round(comparisonResult.analysis.overallSimilarity * 100)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-2">
                  <CheckCircle className="h-6 w-6 mx-auto text-green-600" />
                  <p className="text-lg font-bold text-green-600">{comparisonResult.similarities.length}</p>
                  <p className="text-sm text-muted-foreground">تشابهات</p>
                </div>
                <div className="space-y-2">
                  <AlertTriangle className="h-6 w-6 mx-auto text-orange-600" />
                  <p className="text-lg font-bold text-orange-600">{comparisonResult.differences.length}</p>
                  <p className="text-sm text-muted-foreground">اختلافات</p>
                </div>
                <div className="space-y-2">
                  <TrendingUp className="h-6 w-6 mx-auto text-blue-600" />
                  <p className="text-lg font-bold text-blue-600">{comparisonResult.analysis.riskAssessment.length}</p>
                  <p className="text-sm text-muted-foreground">مخاطر محددة</p>
                </div>
                <div className="space-y-2">
                  <TrendingDown className="h-6 w-6 mx-auto text-purple-600" />
                  <p className="text-lg font-bold text-purple-600">{comparisonResult.analysis.recommendations.length}</p>
                  <p className="text-sm text-muted-foreground">توصيات</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Tabs defaultValue="differences" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="differences">الاختلافات</TabsTrigger>
              <TabsTrigger value="similarities">التشابهات</TabsTrigger>
              <TabsTrigger value="risks">المخاطر</TabsTrigger>
              <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
            </TabsList>

            <TabsContent value="differences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">الاختلافات المكتشفة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {comparisonResult.differences.map((diff, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getImportanceColor(diff.importance)}`}>
                        <div className="flex items-start gap-3">
                          {getDifferenceIcon(diff.type)}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{diff.section}</h4>
                              <Badge variant="outline" className={getImportanceColor(diff.importance)}>
                                {diff.importance === 'high' ? 'مهم' : diff.importance === 'medium' ? 'متوسط' : 'عادي'}
                              </Badge>
                            </div>
                            <div className="grid gap-2 md:grid-cols-2">
                              <div className="p-2 bg-red-50 rounded border border-red-200">
                                <p className="text-xs font-medium text-red-800 mb-1">العقد الأول:</p>
                                <p className="text-sm text-red-700">{diff.document1Content || 'غير موجود'}</p>
                              </div>
                              <div className="p-2 bg-green-50 rounded border border-green-200">
                                <p className="text-xs font-medium text-green-800 mb-1">العقد الثاني:</p>
                                <p className="text-sm text-green-700">{diff.document2Content || 'غير موجود'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="similarities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">التشابهات المكتشفة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisonResult.similarities.map((sim, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-green-50 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-green-800">{sim.section}</h4>
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            {Math.round(sim.similarity * 100)}% تشابه
                          </Badge>
                        </div>
                        <p className="text-sm text-green-700">{sim.content}</p>
                        <Progress 
                          value={sim.similarity * 100} 
                          className="mt-2 h-1"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">تقييم المخاطر</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisonResult.analysis.riskAssessment.map((risk, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(risk.severity)}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium text-sm">{risk.type === 'financial' ? 'مالي' : risk.type === 'legal' ? 'قانوني' : 'تشغيلي'}</h4>
                              <Badge variant="outline" className={
                                risk.severity === 'high' ? 'text-red-600' : 
                                risk.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                              }>
                                {risk.severity === 'high' ? 'عالي' : risk.severity === 'medium' ? 'متوسط' : 'منخفض'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{risk.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">التوصيات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {comparisonResult.analysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800">{rec}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ContractComparator;