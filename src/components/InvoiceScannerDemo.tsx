/**
 * Demo Component showcasing the intelligent invoice scanning capabilities
 * This component demonstrates the full OCR + NLP + Fuzzy Matching pipeline
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  FileText, 
  Zap, 
  TestTube, 
  Eye, 
  Cpu, 
  Languages,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { useInvoiceScanner } from '@/hooks/useInvoiceScanner';
import { detectLanguage, extractKeyInformation } from '@/utils/fuzzyMatching';

const InvoiceScannerDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('demo');
  const [testText, setTestText] = useState('');
  const [textAnalysis, setTextAnalysis] = useState<any>(null);
  
  const { 
    isScanning, 
    progress, 
    scanHistory, 
    scanInvoice, 
    getStatistics,
    analyzeText 
  } = useInvoiceScanner({
    ocrEngine: 'gemini',
    language: 'auto',
    autoAssignThreshold: 85,
    reviewThreshold: 70
  });

  const stats = getStatistics();

  // Sample test data to demonstrate the system
  const sampleInvoices = [
    {
      name: 'فاتورة عربية مكتوبة باليد',
      description: 'مثال على فاتورة مكتوبة باليد باللغة العربية مع أسماء العملاء',
      mockData: {
        customer_name: 'محمد أحمد الخالدي',
        car_number: 'أ ب ج 123',
        total_amount: 150.5,
        language_detected: 'arabic',
        raw_text: 'فاتورة رقم 2024001\nالعميل: محمد أحمد الخالدي\nرقم المركبة: أ ب ج 123\nالمبلغ: 150.5 د.ك\nشهر يوليو 2024'
      }
    },
    {
      name: 'English Handwritten Invoice',
      description: 'Example of handwritten English invoice with customer names',
      mockData: {
        customer_name: 'Mohammed Al-Khalidi',
        car_number: 'ABC-123',
        total_amount: 200.0,
        language_detected: 'english',
        raw_text: 'Invoice #2024002\nCustomer: Mohammed Al-Khalidi\nVehicle: ABC-123\nAmount: 200.0 KD\nJuly 2024'
      }
    },
    {
      name: 'Mixed Language Invoice',
      description: 'Invoice with both Arabic and English text',
      mockData: {
        customer_name: 'Ahmad Salem أحمد سالم',
        car_number: '456-XYZ',
        total_amount: 175.25,
        language_detected: 'mixed',
        raw_text: 'Invoice فاتورة #2024003\nCustomer العميل: Ahmad Salem أحمد سالم\nCar Number رقم السيارة: 456-XYZ\nAmount المبلغ: 175.25 KD د.ك'
      }
    }
  ];

  const handleDemoScan = async (mockData: any) => {
    // Simulate the scanning process with mock data
    const mockResult = {
      id: Date.now().toString(),
      data: mockData,
      matching: {
        best_match: {
          id: 'demo-customer-1',
          name: mockData.customer_name,
          phone: '+965 1234 5678',
          car_number: mockData.car_number,
          confidence: Math.floor(Math.random() * 30) + 70, // 70-100%
          match_reasons: ['تطابق قوي في الاسم', 'تطابق رقم المركبة']
        },
        all_matches: [],
        total_confidence: Math.floor(Math.random() * 30) + 70,
        name_similarity: Math.floor(Math.random() * 20) + 80,
        car_match_score: Math.floor(Math.random() * 15) + 85,
        context_match_score: Math.floor(Math.random() * 25) + 75
      },
      processing_info: {
        ocr_engine: 'gemini',
        language_detected: mockData.language_detected,
        ocr_confidence: Math.floor(Math.random() * 20) + 80
      }
    };

    console.log('Demo scan result:', mockResult);
    return mockResult;
  };

  const handleTextAnalysis = () => {
    if (!testText.trim()) return;
    
    const analysis = analyzeText(testText);
    setTextAnalysis(analysis);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800';
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return <CheckCircle className="h-4 w-4" />;
    if (confidence >= 70) return <Clock className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <div className=\"max-w-7xl mx-auto p-6 space-y-6\">
      {/* Header */}
      <Card className=\"bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200\">
        <CardHeader>
          <CardTitle className=\"flex items-center gap-3 text-2xl\">
            <div className=\"p-2 bg-blue-500 rounded-lg\">
              <Brain className=\"h-6 w-6 text-white\" />
            </div>
            نظام مسح الفواتير الذكي - عرض توضيحي
            <Badge className=\"bg-gradient-to-r from-blue-500 to-purple-600 text-white\">
              <Sparkles className=\"h-3 w-3 mr-1\" />
              AI Demo
            </Badge>
          </CardTitle>
          <p className=\"text-gray-600\">
            عرض توضيحي شامل لقدرات النظام في التعرف الضوئي، معالجة اللغات الطبيعية، والتطابق الضبابي
          </p>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-gray-600\">إجمالي المسحات</p>
                <p className=\"text-2xl font-bold text-blue-600\">{stats.total}</p>
              </div>
              <FileText className=\"h-8 w-8 text-blue-500\" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-gray-600\">معدل النجاح</p>
                <p className=\"text-2xl font-bold text-green-600\">{stats.successRate}%</p>
              </div>
              <Target className=\"h-8 w-8 text-green-500\" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-gray-600\">دقة التعرف</p>
                <p className=\"text-2xl font-bold text-purple-600\">{stats.avgOcrConfidence}%</p>
              </div>
              <Eye className=\"h-8 w-8 text-purple-500\" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className=\"pt-6\">
            <div className=\"flex items-center justify-between\">
              <div>
                <p className=\"text-sm font-medium text-gray-600\">دقة التطابق</p>
                <p className=\"text-2xl font-bold text-orange-600\">{stats.avgMatchConfidence}%</p>
              </div>
              <Cpu className=\"h-8 w-8 text-orange-500\" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Demo Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className=\"grid w-full grid-cols-3\">
          <TabsTrigger value=\"demo\" className=\"flex items-center gap-2\">
            <TestTube className=\"h-4 w-4\" />
            عرض تفاعلي
          </TabsTrigger>
          <TabsTrigger value=\"text-analysis\" className=\"flex items-center gap-2\">
            <Languages className=\"h-4 w-4\" />
            تحليل النصوص
          </TabsTrigger>
          <TabsTrigger value=\"history\" className=\"flex items-center gap-2\">
            <FileText className=\"h-4 w-4\" />
            سجل المسح
          </TabsTrigger>
        </TabsList>

        <TabsContent value=\"demo\" className=\"space-y-6\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Zap className=\"h-5 w-5\" />
                اختبر النظام مع عينات متنوعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                {sampleInvoices.map((invoice, index) => (
                  <Card key={index} className=\"border-dashed border-2 hover:border-blue-400 transition-colors\">
                    <CardContent className=\"pt-6\">
                      <div className=\"text-center space-y-3\">
                        <h3 className=\"font-semibold\">{invoice.name}</h3>
                        <p className=\"text-sm text-gray-600\">{invoice.description}</p>
                        <div className=\"text-xs text-gray-500 bg-gray-50 p-2 rounded\">
                          <div>العميل: {invoice.mockData.customer_name}</div>
                          <div>المركبة: {invoice.mockData.car_number}</div>
                          <div>المبلغ: {invoice.mockData.total_amount} د.ك</div>
                        </div>
                        <Button 
                          onClick={() => handleDemoScan(invoice.mockData)}
                          className=\"w-full\"
                          variant=\"outline\"
                        >
                          <Brain className=\"h-4 w-4 mr-2\" />
                          اختبار المسح
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {isScanning && (
                <div className=\"mt-6\">
                  <Alert>
                    <Cpu className=\"h-4 w-4\" />
                    <AlertDescription>
                      جاري معالجة الفاتورة بالذكاء الاصطناعي...
                    </AlertDescription>
                  </Alert>
                  <Progress value={progress} className=\"mt-2\" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"text-analysis\" className=\"space-y-6\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Languages className=\"h-5 w-5\" />
                محلل النصوص المتقدم
              </CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <div>
                <Label htmlFor=\"test-text\">أدخل نص لتحليله (عربي، إنجليزي، أو مختلط)</Label>
                <Textarea
                  id=\"test-text\"
                  placeholder=\"مثال: فاتورة رقم 123 للعميل محمد أحمد، رقم السيارة ABC-456، المبلغ 100 د.ك لشهر يوليو\"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className=\"mt-2 h-32\"
                />
              </div>
              
              <Button onClick={handleTextAnalysis} disabled={!testText.trim()}>
                <Brain className=\"h-4 w-4 mr-2\" />
                تحليل النص
              </Button>
              
              {textAnalysis && (
                <Card className=\"bg-gray-50\">
                  <CardContent className=\"pt-6\">
                    <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                      <div>
                        <h4 className=\"font-semibold mb-2\">معلومات اللغة</h4>
                        <div className=\"space-y-1 text-sm\">
                          <div>اللغة المكتشفة: <Badge>{textAnalysis.language}</Badge></div>
                          <div>يحتوي على عربية: {textAnalysis.has_arabic ? '✅' : '❌'}</div>
                          <div>يحتوي على إنجليزية: {textAnalysis.has_english ? '✅' : '❌'}</div>
                          <div>طول النص: {textAnalysis.text_length} حرف</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className=\"font-semibold mb-2\">المعلومات المستخرجة</h4>
                        <div className=\"space-y-1 text-sm\">
                          <div>أرقام السيارات: {textAnalysis.car_numbers?.join(', ') || 'لا يوجد'}</div>
                          <div>الشهور: {textAnalysis.months?.join(', ') || 'لا يوجد'}</div>
                          <div>المبالغ: {textAnalysis.potential_amounts?.join(', ') || 'لا يوجد'}</div>
                          <div>أرقام الاتفاقيات: {textAnalysis.agreement_numbers?.join(', ') || 'لا يوجد'}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"history\" className=\"space-y-6\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <FileText className=\"h-5 w-5\" />
                سجل عمليات المسح
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <div className=\"text-center py-8 text-gray-500\">
                  <FileText className=\"h-12 w-12 mx-auto mb-4 opacity-50\" />
                  <p>لا توجد عمليات مسح حتى الآن</p>
                  <p className=\"text-sm\">جرب المسح في قسم العرض التفاعلي</p>
                </div>
              ) : (
                <div className=\"space-y-4\">
                  {scanHistory.map((scan, index) => (
                    <Card key={scan.id} className=\"border-l-4 border-l-blue-500\">
                      <CardContent className=\"pt-4\">
                        <div className=\"flex items-center justify-between mb-3\">
                          <div className=\"flex items-center gap-2\">
                            <span className=\"font-medium\">مسح #{index + 1}</span>
                            <Badge variant=\"outline\">{scan.processing_info.language_detected}</Badge>
                          </div>
                          <div className=\"flex items-center gap-2\">
                            <Badge className={getConfidenceBadge(scan.matching.total_confidence)}>
                              {getConfidenceIcon(scan.matching.total_confidence)}
                              {Math.round(scan.matching.total_confidence)}%
                            </Badge>
                          </div>
                        </div>
                        
                        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 text-sm\">
                          <div>
                            <span className=\"font-medium\">العميل:</span>
                            <p className=\"text-gray-600\">{scan.data.customer_name || 'غير محدد'}</p>
                          </div>
                          <div>
                            <span className=\"font-medium\">أفضل تطابق:</span>
                            <p className=\"text-gray-600\">{scan.matching.best_match?.name || 'لا يوجد'}</p>
                          </div>
                          <div>
                            <span className=\"font-medium\">دقة التعرف:</span>
                            <p className=\"text-gray-600\">{scan.processing_info.ocr_confidence}%</p>
                          </div>
                        </div>
                        
                        {scan.matching.best_match?.match_reasons && (
                          <div className=\"mt-3\">
                            <span className=\"text-sm font-medium\">أسباب التطابق:</span>
                            <div className=\"flex flex-wrap gap-1 mt-1\">
                              {scan.matching.best_match.match_reasons.map((reason, idx) => (
                                <Badge key={idx} variant=\"secondary\" className=\"text-xs\">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceScannerDemo;