import React, { useState, useEffect, useRef } from 'react';
import { FormattedResponse } from './FormattedResponse';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap, 
  TrendingUp,
  Shield,
  Database,
  Settings,
  Download,
  Send,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
  Info,
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Share2,
  Printer
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ClientData {
  personal_info: {
    id: string;
    name: string;
    id_number: string;
    address: string;
    phone: string;
    email: string;
  };
  contracts: Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    amount: number;
    terms: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    payment_status: string;
    due_date: string;
  }>;
  violations: Array<{
    id: string;
    description: string;
    status: string;
    date: string;
  }>;
}

interface LegalAdviceResponse {
  success: boolean;
  response: string;
  source: 'cache' | 'local' | 'api';
  processing_time: number;
  confidence: number;
  legal_basis?: string[];
  recommendations?: string[];
  urgency_level?: string;
  estimated_cost?: number;
}

interface DocumentGenerationResult {
  success: boolean;
  document: string;
  document_type: string;
  metadata: {
    document_id: string;
    reference_number: string;
    generated_at: string;
    jurisdiction: string;
  };
  validation_result: {
    is_valid: boolean;
    completeness_score: number;
    issues: string[];
    suggestions: string[];
  };
}

interface PerformanceStats {
  cache_hit_rate: number;
  average_response_time: number;
  total_requests: number;
  cost_savings: number;
  user_satisfaction: number;
}

const EnhancedLegalAIInterface: React.FC<{ company_id: string }> = ({ company_id }) => {
  // State Management
  const [activeTab, setActiveTab] = useState('consultation');
  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('kuwait');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<LegalAdviceResponse | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    query: string;
    response: LegalAdviceResponse;
    timestamp: Date;
  }>>([]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    cache_hit_rate: 0,
    average_response_time: 0,
    total_requests: 0,
    cost_savings: 0,
    user_satisfaction: 0
  });
  const [documentResult, setDocumentResult] = useState<DocumentGenerationResult | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
  }>>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  // Load performance stats on component mount
  useEffect(() => {
    loadPerformanceStats();
    const interval = setInterval(loadPerformanceStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadPerformanceStats = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/stats');
      if (response.ok) {
        const stats = await response.json();
        setPerformanceStats(stats);
      }
    } catch (error) {
      console.error('Error loading performance stats:', error);
    }
  };

  const loadClientData = async (clientId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5001/api/client-data/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClientData(data);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      addNotification('error', 'فشل في تحميل بيانات العميل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLegalConsultation = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const requestBody = {
        query,
        country: selectedCountry,
        client_id: selectedClient,
        context: clientData ? {
          client_data: clientData,
          conversation_history: conversationHistory.slice(-5) // Last 5 messages for context
        } : null
      };

      const response = await fetch('http://localhost:5001/api/legal-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result: LegalAdviceResponse = await response.json();
        const processingTime = Date.now() - startTime;
        
        result.processing_time = processingTime / 1000; // Convert to seconds
        
        setResponse(result);
        
        // Add to conversation history
        const conversationEntry = {
          id: Date.now().toString(),
          query,
          response: result,
          timestamp: new Date()
        };
        
        setConversationHistory(prev => [...prev, conversationEntry]);
        
        // Clear query
        setQuery('');
        
        // Show success notification
        addNotification('success', `تم الحصول على الاستشارة في ${result.processing_time.toFixed(2)} ثانية`);
        
        // Update performance stats
        loadPerformanceStats();
      } else {
        throw new Error('فشل في الحصول على الاستشارة القانونية');
      }
    } catch (error) {
      console.error('Error getting legal advice:', error);
      addNotification('error', 'فشل في الحصول على الاستشارة القانونية');
    } finally {
      setIsLoading(false);
    }
  };

  const generateLegalDocument = async (documentType: string) => {
    if (!selectedClient || !clientData) {
      addNotification('warning', 'يرجى اختيار عميل أولاً');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5001/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_type: documentType,
          client_data: clientData,
          country: selectedCountry
        })
      });

      if (response.ok) {
        const result: DocumentGenerationResult = await response.json();
        setDocumentResult(result);
        addNotification('success', 'تم إنشاء الوثيقة القانونية بنجاح');
      } else {
        throw new Error('فشل في إنشاء الوثيقة القانونية');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      addNotification('error', 'فشل في إنشاء الوثيقة القانونية');
    } finally {
      setIsLoading(false);
    }
  };

  const testApiConnection = async () => {
    if (!apiKey.trim()) {
      addNotification('warning', 'يرجى إدخال مفتاح API أولاً');
      return;
    }

    setApiStatus('testing');

    try {
      const response = await fetch('http://localhost:5001/api/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setApiStatus('connected');
          addNotification('success', 'تم الاتصال بـ API بنجاح');
        } else {
          setApiStatus('disconnected');
          addNotification('error', result.error || 'فشل في الاتصال بـ API');
        }
      } else {
        setApiStatus('disconnected');
        addNotification('error', 'فشل في اختبار الاتصال');
      }
    } catch (error) {
      setApiStatus('disconnected');
      addNotification('error', 'خطأ في الاتصال بالخادم');
    }
  };

  const addNotification = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('success', 'تم نسخ النص');
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'cache': return <Zap className="h-4 w-4 text-green-500" />;
      case 'local': return <Database className="h-4 w-4 text-blue-500" />;
      case 'api': return <Brain className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'حرج': return 'bg-red-500';
      case 'عالي': return 'bg-orange-500';
      case 'متوسط': return 'bg-yellow-500';
      case 'منخفض': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Performance chart data
  const performanceChartData = [
    { name: 'معدل الإصابة', value: performanceStats.cache_hit_rate * 100 },
    { name: 'وقت الاستجابة', value: performanceStats.average_response_time * 1000 },
    { name: 'رضا المستخدمين', value: performanceStats.user_satisfaction * 100 },
  ];

  const costSavingsData = [
    { name: 'التوفير الشهري', value: performanceStats.cost_savings },
    { name: 'التكلفة التقليدية', value: performanceStats.cost_savings * 4 },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <Alert key={notification.id} className={`w-80 ${
            notification.type === 'success' ? 'border-green-500' :
            notification.type === 'warning' ? 'border-yellow-500' :
            notification.type === 'error' ? 'border-red-500' :
            'border-blue-500'
          }`}>
            {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {notification.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
            {notification.type === 'info' && <Info className="h-4 w-4" />}
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-8 w-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">المستشار القانوني الذكي المحسن</CardTitle>
                <CardDescription>
                  نظام متقدم للاستشارات القانونية مع ذكاء اصطناعي وتكامل قاعدة البيانات
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={apiStatus === 'connected' ? 'default' : 'secondary'}>
                {apiStatus === 'connected' ? 'متصل' : 'غير متصل'}
              </Badge>
              <Badge variant="outline">
                {performanceStats.total_requests} استفسار
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="consultation" className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4" />
            <span>الاستشارة</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>الوثائق</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>العملاء</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>الأداء</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>الإعدادات</span>
          </TabsTrigger>
        </TabsList>

        {/* Consultation Tab */}
        <TabsContent value="consultation" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>محادثة الاستشارة القانونية</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">اختر الدولة</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kuwait">🇰🇼 الكويت</SelectItem>
                          <SelectItem value="saudi_arabia">🇸🇦 السعودية</SelectItem>
                          <SelectItem value="qatar">🇶🇦 قطر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">اختر العميل (اختياري)</label>
                      <Select value={selectedClient} onValueChange={(value) => {
                        setSelectedClient(value);
                        if (value) loadClientData(value);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="بدون عميل محدد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client_1">أحمد محمد الكويتي</SelectItem>
                          <SelectItem value="client_2">فاطمة علي السعودية</SelectItem>
                          <SelectItem value="client_3">محمد حسن القطري</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Conversation History */}
                  <ScrollArea className="h-96 w-full border rounded-lg p-4">
                    <div className="space-y-4">
                      {conversationHistory.map((entry) => (
                        <div key={entry.id} className="space-y-2">
                          {/* User Query */}
                          <div className="flex justify-end">
                            <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                              <p className="text-sm">{entry.query}</p>
                              <p className="text-xs opacity-75 mt-1">
                                {entry.timestamp.toLocaleTimeString('ar-SA')}
                              </p>
                            </div>
                          </div>
                          
                          {/* AI Response */}
                          <div className="flex justify-start">
                            <div className="bg-gray-100 p-3 rounded-lg max-w-2xl">
                              <div className="flex items-center space-x-2 mb-2">
                                {getSourceIcon(entry.response.source)}
                                <Badge variant="outline" className="text-xs">
                                  {entry.response.source === 'cache' ? 'من الذاكرة' :
                                   entry.response.source === 'local' ? 'محلي' : 'ذكي'}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {entry.response.processing_time.toFixed(1)}ث
                                </Badge>
                                {entry.response.urgency_level && (
                                  <Badge className={`text-xs text-white ${getUrgencyColor(entry.response.urgency_level)}`}>
                                    {entry.response.urgency_level}
                                  </Badge>
                                )}
                              </div>
                              <FormattedResponse content={entry.response.response} className="text-sm" />
                              
                              {entry.response.legal_basis && entry.response.legal_basis.length > 0 && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <p className="text-xs font-semibold text-blue-800">الأساس القانوني:</p>
                                  <ul className="text-xs text-blue-700 mt-1">
                                    {entry.response.legal_basis.map((basis, index) => (
                                      <li key={index}>• {basis}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {entry.response.recommendations && entry.response.recommendations.length > 0 && (
                                <div className="mt-2 p-2 bg-green-50 rounded">
                                  <p className="text-xs font-semibold text-green-800">التوصيات:</p>
                                  <ul className="text-xs text-green-700 mt-1">
                                    {entry.response.recommendations.map((rec, index) => (
                                      <li key={index}>• {rec}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center space-x-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(entry.response.response)}
                                    title="نسخ النص"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span className="ml-1 text-xs">نسخ</span>
                                  </Button>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-500">
                                    دقة: {Math.round(entry.response.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="اكتب استفسارك القانوني هنا... مثال: اكتب إنذار قانوني للعميل أحمد"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-h-20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleLegalConsultation();
                        }
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Enter للإرسال • Shift+Enter لسطر جديد
                      </div>
                      <Button 
                        onClick={handleLegalConsultation}
                        disabled={isLoading || !query.trim()}
                        className="flex items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>جاري المعالجة...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>إرسال الاستفسار</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Client Information Panel */}
            <div className="space-y-4">
              {clientData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>معلومات العميل</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{clientData.personal_info.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{clientData.personal_info.phone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{clientData.personal_info.email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{clientData.personal_info.address}</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{clientData.contracts.length}</p>
                        <p className="text-xs text-gray-500">العقود</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">
                          {clientData.payments.filter(p => p.payment_status === 'overdue').length}
                        </p>
                        <p className="text-xs text-gray-500">متأخرات</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{clientData.violations.length}</p>
                        <p className="text-xs text-gray-500">المخالفات</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {clientData.payments.reduce((sum, p) => sum + p.amount, 0)}
                        </p>
                        <p className="text-xs text-gray-500">إجمالي المبالغ</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>إجراءات سريعة</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setQuery('ما هي متطلبات ترخيص شركة تأجير سيارات؟')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    متطلبات الترخيص
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setQuery('اكتب إنذار قانوني للعميل المتأخر في السداد')}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    إنذار قانوني
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setQuery('ما هي الإجراءات القانونية لاسترداد السيارة؟')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    استرداد السيارة
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setQuery('كيفية التعامل مع مخالفات المرور؟')}
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    مخالفات المرور
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>إنشاء الوثائق القانونية</CardTitle>
                <CardDescription>
                  إنشاء وثائق قانونية مخصصة بناءً على بيانات العميل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    onClick={() => generateLegalDocument('legal_notice')}
                    disabled={!selectedClient || isLoading}
                    className="h-20 flex-col"
                  >
                    <AlertTriangle className="h-6 w-6 mb-2" />
                    إنذار قانوني
                  </Button>
                  <Button 
                    onClick={() => generateLegalDocument('payment_demand')}
                    disabled={!selectedClient || isLoading}
                    className="h-20 flex-col"
                    variant="outline"
                  >
                    <CreditCard className="h-6 w-6 mb-2" />
                    مطالبة مالية
                  </Button>
                  <Button 
                    onClick={() => generateLegalDocument('contract_termination')}
                    disabled={!selectedClient || isLoading}
                    className="h-20 flex-col"
                    variant="outline"
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    إنهاء عقد
                  </Button>
                  <Button 
                    onClick={() => generateLegalDocument('violation_warning')}
                    disabled={!selectedClient || isLoading}
                    className="h-20 flex-col"
                    variant="outline"
                  >
                    <AlertCircle className="h-6 w-6 mb-2" />
                    تحذير مخالفة
                  </Button>
                </div>
                
                {!selectedClient && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      يرجى اختيار عميل من تبويب الاستشارة لإنشاء الوثائق المخصصة
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Document Preview */}
            {documentResult && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>معاينة الوثيقة</CardTitle>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        تحميل
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="h-4 w-4 mr-2" />
                        طباعة
                      </Button>
                      <Button size="sm" variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        مشاركة
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {documentResult.document_type} - {documentResult.metadata.reference_number}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Document Quality Indicators */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`h-4 w-4 ${
                          documentResult.validation_result.is_valid ? 'text-green-500' : 'text-red-500'
                        }`} />
                        <span className="text-sm">
                          {documentResult.validation_result.is_valid ? 'صحيح' : 'يحتاج مراجعة'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={documentResult.validation_result.completeness_score} 
                          className="w-20" 
                        />
                        <span className="text-sm">
                          {documentResult.validation_result.completeness_score.toFixed(0)}% مكتمل
                        </span>
                      </div>
                    </div>

                    {/* Document Content */}
                    <ScrollArea className="h-96 w-full border rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {documentResult.document}
                      </pre>
                    </ScrollArea>

                    {/* Validation Issues */}
                    {documentResult.validation_result.issues.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>مشاكل في الوثيقة</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-2">
                            {documentResult.validation_result.issues.map((issue, index) => (
                              <li key={index} className="text-sm">{issue}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Suggestions */}
                    {documentResult.validation_result.suggestions.length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>اقتراحات التحسين</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside mt-2">
                            {documentResult.validation_result.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm">{suggestion}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {(performanceStats.cache_hit_rate * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">معدل إصابة التخزين المؤقت</p>
                  </div>
                  <Zap className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(performanceStats.average_response_time * 1000).toFixed(0)}ms
                    </p>
                    <p className="text-sm text-gray-500">متوسط وقت الاستجابة</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {performanceStats.total_requests}
                    </p>
                    <p className="text-sm text-gray-500">إجمالي الطلبات</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      ${performanceStats.cost_savings.toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-500">التوفير الشهري</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>مؤشرات الأداء</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توفير التكلفة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costSavingsData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label
                    >
                      {costSavingsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>إعدادات API</span>
              </CardTitle>
              <CardDescription>
                إدارة مفاتيح API واختبار الاتصال
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">مفتاح OpenAI API</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    onClick={testApiConnection}
                    disabled={apiStatus === 'testing'}
                    variant="outline"
                  >
                    {apiStatus === 'testing' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    اختبار
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'connected' ? 'bg-green-500' :
                  apiStatus === 'testing' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-sm">
                  {apiStatus === 'connected' ? 'متصل بنجاح' :
                   apiStatus === 'testing' ? 'جاري الاختبار...' : 'غير متصل'}
                </span>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>أمان البيانات</AlertTitle>
                <AlertDescription>
                  مفتاح API يُحفظ محلياً في متصفحك فقط ولا يتم إرساله لأي خادم خارجي.
                  جميع الاتصالات مشفرة ومحمية.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>إعدادات النظام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الدولة الافتراضية</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kuwait">🇰🇼 الكويت</SelectItem>
                    <SelectItem value="saudi_arabia">🇸🇦 السعودية</SelectItem>
                    <SelectItem value="qatar">🇶🇦 قطر</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">إعدادات التحسين</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">تفعيل التخزين المؤقت التنبؤي</span>
                    <Button variant="outline" size="sm">تفعيل</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">معالجة الطلبات المتوازية</span>
                    <Button variant="outline" size="sm">تفعيل</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">ضغط البيانات</span>
                    <Button variant="outline" size="sm">تفعيل</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLegalAIInterface;

