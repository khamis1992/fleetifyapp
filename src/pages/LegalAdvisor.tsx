// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Scale,
  Send,
  Copy,
  Download,
  Printer,
  FileText,
  User,
  Bot,
  Sparkles,
  Key,
  Search,
  BookOpen,
  Gavel,
  AlertCircle,
  CheckCircle,
  Loader2,
  MessageSquare,
  Settings,
  History,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface LegalArticle {
  id: string;
  law_name_ar: string;
  article_number: string;
  content_ar: string;
  category: string;
}

// OpenAI API call
const callOpenAI = async (
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'فشل في الاتصال بـ OpenAI');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'لم أتمكن من الإجابة';
};

const LegalAdvisor: React.FC = () => {
  const companyId = useCurrentCompanyId();
  const { user } = useAuth();
  
  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Document Generator State
  const [docType, setDocType] = useState('complaint');
  const [docData, setDocData] = useState({
    defendant_name: '',
    defendant_qid: '',
    late_payment_penalty: '',
    unpaid_rent: '',
    damages_compensation: '',
  });
  const [generatedDoc, setGeneratedDoc] = useState('');

  // Fetch legal knowledge base
  const { data: legalArticles } = useQuery({
    queryKey: ['legal-knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_knowledge_base')
        .select('*')
        .eq('country', 'qatar')
        .limit(500);
      
      if (error) {
        console.error('Error fetching legal knowledge:', error);
        return [];
      }
      return data as LegalArticle[];
    },
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });

  // Fetch company info
  const { data: companyInfo } = useQuery({
    queryKey: ['company-info', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from('companies')
        .select('name, address, commercial_registration')
        .eq('id', companyId)
        .single();
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch legal templates
  const { data: legalTemplates } = useQuery({
    queryKey: ['legal-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('legal_templates')
        .select('*')
        .eq('is_active', true);
      return data || [];
    },
  });

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `مرحباً بك في المستشار القانوني الذكي 🇶🇦

أنا متخصص في القوانين القطرية، ويمكنني مساعدتك في:

📚 **الاستشارات القانونية** - أسئلة حول القانون المدني، التجاري، المرور، والعقوبات
📋 **إنشاء المذكرات** - مذكرات قانونية، شكاوى، إنذارات
⚖️ **تفسير القوانين** - شرح المواد القانونية القطرية

اكتب سؤالك وسأساعدك!`,
        timestamp: new Date(),
      }]);
    }
  }, []);

  // Save API key
  const handleSaveApiKey = () => {
    localStorage.setItem('openai_api_key', apiKey);
    setShowSettings(false);
    toast.success('تم حفظ مفتاح API');
  };

  // Build system prompt with legal knowledge
  const buildSystemPrompt = () => {
    let relevantArticles = '';
    
    if (legalArticles && legalArticles.length > 0) {
      // Get a sample of articles for context
      const sampleArticles = legalArticles.slice(0, 50);
      relevantArticles = sampleArticles.map(a => 
        `[${a.law_name_ar} - المادة ${a.article_number}]: ${a.content_ar}`
      ).join('\n\n');
    }

    return `أنت مستشار قانوني متخصص في القوانين القطرية. لديك معرفة شاملة بـ:
- الدستور القطري
- القانون المدني القطري
- القانون التجاري القطري
- قانون المرور القطري
- قانون العقوبات القطري
- لوائح تأجير السيارات والليموزين في قطر

عند الإجابة:
1. استند دائماً للمواد القانونية المحددة
2. اذكر رقم المادة والقانون
3. قدم نصائح عملية وواضحة
4. استخدم اللغة العربية الفصحى
5. كن محترفاً ودقيقاً

بعض المواد القانونية القطرية للرجوع إليها:
${relevantArticles}

ملاحظة: أنت تتعامل مع شركة تأجير سيارات في قطر، فركز على القضايا المتعلقة بعقود التأجير، المخالفات المرورية، التأخر في السداد، وإجراءات التحصيل.`;
  };

  // Send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!apiKey) {
      toast.error('يرجى إدخال مفتاح OpenAI API في الإعدادات');
      setShowSettings(true);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await callOpenAI(
        apiKey,
        buildSystemPrompt(),
        inputValue
      );

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ في معالجة الطلب');
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ عذراً، حدث خطأ: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate document
  const handleGenerateDocument = () => {
    const template = legalTemplates?.find(t => t.code === 'CIVIL_MEMO_TRAFFIC_FINES_TRANSFER');
    
    if (!template) {
      toast.error('لم يتم العثور على القالب');
      return;
    }

    const totalAmount = 
      parseFloat(docData.late_payment_penalty || '0') +
      parseFloat(docData.unpaid_rent || '0') +
      parseFloat(docData.damages_compensation || '0');

    let doc = template.body_ar
      .replace(/\{\{company_name\}\}/g, companyInfo?.name || 'الشركة')
      .replace(/\{\{company_address\}\}/g, companyInfo?.address || 'العنوان')
      .replace(/\{\{company_cr\}\}/g, companyInfo?.commercial_registration || 'رقم السجل')
      .replace(/\{\{defendant_name\}\}/g, docData.defendant_name || '[اسم المدعى عليه]')
      .replace(/\{\{defendant_qid\}\}/g, docData.defendant_qid || '[رقم البطاقة]')
      .replace(/\{\{late_payment_penalty\}\}/g, docData.late_payment_penalty || '0')
      .replace(/\{\{unpaid_rent\}\}/g, docData.unpaid_rent || '0')
      .replace(/\{\{damages_compensation\}\}/g, docData.damages_compensation || '0')
      .replace(/\{\{total_amount_numeric\}\}/g, totalAmount.toFixed(2))
      .replace(/\{\{total_amount_words\}\}/g, `${totalAmount.toFixed(2)} ريال قطري`);

    setGeneratedDoc(doc);
    toast.success('تم إنشاء المذكرة بنجاح');
  };

  // Copy document
  const handleCopyDoc = () => {
    navigator.clipboard.writeText(generatedDoc);
    toast.success('تم نسخ المذكرة');
  };

  // Print document
  const handlePrintDoc = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>مذكرة قانونية</title>
            <style>
              body { font-family: 'Arial', sans-serif; padding: 40px; line-height: 2; }
              h1 { text-align: center; }
            </style>
          </head>
          <body>
            <pre style="white-space: pre-wrap; font-family: inherit;">${generatedDoc}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Search legal articles
  const filteredArticles = legalArticles?.filter(article =>
    article.content_ar.includes(searchQuery) ||
    article.law_name_ar.includes(searchQuery) ||
    article.article_number.includes(searchQuery)
  ).slice(0, 20);

  // Clear chat
  const handleClearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'تم مسح المحادثة. كيف يمكنني مساعدتك؟',
      timestamp: new Date(),
    }]);
  };

  // Message component
  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user';

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex gap-3 mb-4",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Scale className="w-5 h-5" />}
        </div>
        
        <div className={cn(
          "max-w-[80%] rounded-2xl p-4 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-none" 
            : "bg-card border rounded-tl-none"
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <div className={cn(
            "flex items-center gap-2 mt-2 text-xs",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            <span>{format(message.timestamp, 'HH:mm', { locale: ar })}</span>
            {!isUser && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                  toast.success('تم النسخ');
                }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-background border-violet-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Scale className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    المستشار القانوني الذكي
                    <Badge className="bg-violet-500/20 text-violet-700 border-violet-500/30">
                      🇶🇦 قطر
                    </Badge>
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    متخصص في القوانين القطرية وقضايا تأجير السيارات
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="w-4 h-4 ml-2" />
                  الإعدادات
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            استشارة قانونية
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            إنشاء مذكرة
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            المكتبة القانونية
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="w-5 h-5 text-violet-500" />
                  محادثة مع المستشار
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleClearChat}>
                  <Trash2 className="w-4 h-4 ml-2" />
                  مسح المحادثة
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                {messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground p-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التفكير...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
            </CardContent>

            <div className="border-t p-4 flex-shrink-0">
              {/* Quick prompts */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  'ما هي إجراءات تحصيل الإيجار المتأخر؟',
                  'كيف أحول المخالفات المرورية للمستأجر؟',
                  'ما هي حقوقي كمؤجر عند إخلال المستأجر؟',
                ].map((prompt, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setInputValue(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب سؤالك القانوني هنا..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-violet-500" />
                  بيانات المذكرة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>نوع المذكرة</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="complaint">مذكرة شارحة - مطالبة مالية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>اسم المدعى عليه</Label>
                  <Input
                    placeholder="أدخل اسم المدعى عليه"
                    value={docData.defendant_name}
                    onChange={(e) => setDocData(prev => ({ ...prev, defendant_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>رقم البطاقة الشخصية</Label>
                  <Input
                    placeholder="رقم البطاقة القطرية"
                    value={docData.defendant_qid}
                    onChange={(e) => setDocData(prev => ({ ...prev, defendant_qid: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>غرامات التأخير (ر.ق)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={docData.late_payment_penalty}
                    onChange={(e) => setDocData(prev => ({ ...prev, late_payment_penalty: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>الإيجار المتأخر (ر.ق)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={docData.unpaid_rent}
                    onChange={(e) => setDocData(prev => ({ ...prev, unpaid_rent: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>تعويض الأضرار (ر.ق)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={docData.damages_compensation}
                    onChange={(e) => setDocData(prev => ({ ...prev, damages_compensation: e.target.value }))}
                  />
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-violet-500 to-purple-600"
                  onClick={handleGenerateDocument}
                >
                  <FileText className="w-4 h-4 ml-2" />
                  إنشاء المذكرة
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>المعاينة</CardTitle>
                  {generatedDoc && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopyDoc}>
                        <Copy className="w-4 h-4 ml-1" />
                        نسخ
                      </Button>
                      <Button variant="outline" size="sm" onClick={handlePrintDoc}>
                        <Printer className="w-4 h-4 ml-1" />
                        طباعة
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] rounded-lg border p-4 bg-muted/30">
                  {generatedDoc ? (
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                      {generatedDoc}
                    </pre>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <FileText className="w-12 h-12 mb-4 opacity-30" />
                      <p>أدخل البيانات وانقر "إنشاء المذكرة"</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                  المكتبة القانونية القطرية
                </CardTitle>
                <Badge variant="outline">
                  {legalArticles?.length || 0} مادة قانونية
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث في القوانين القطرية..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredArticles?.map((article) => (
                    <Card key={article.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Scale className="w-4 h-4 text-violet-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {article.law_name_ar}
                            </Badge>
                            <Badge className="bg-violet-500/20 text-violet-700 text-xs">
                              المادة {article.article_number}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {article.content_ar}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {filteredArticles?.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>لم يتم العثور على نتائج</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              إعدادات API
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>مفتاح OpenAI API</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                يمكنك الحصول على المفتاح من{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  platform.openai.com
                </a>
              </p>
            </div>
            <Button onClick={handleSaveApiKey} className="w-full">
              <CheckCircle className="w-4 h-4 ml-2" />
              حفظ الإعدادات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LegalAdvisor;

