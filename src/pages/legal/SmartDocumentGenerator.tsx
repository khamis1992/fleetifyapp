/**
 * مساعد الكتب الرسمية الذكي
 * Smart Official Document Generator
 * 
 * نظام ذكي لتوليد الكتب الرسمية باستخدام الذكاء الاصطناعي GLM
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  FileText, 
  Download, 
  Printer,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  Building2,
  Car,
  User,
  FileEdit,
  Bot,
  Wand2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

import {
  DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
  generateOfficialDocument,
  DocumentTemplate,
  Question,
} from '@/services/ai/ZhipuAIService';

// أنواع الرسائل
interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content: string;
  timestamp: Date;
  questionId?: string;
  options?: string[];
}

// خطوات المحادثة
type ConversationStep = 'welcome' | 'category' | 'template' | 'questions' | 'generating' | 'preview';

const categoryIcons: Record<string, any> = {
  insurance: Building2,
  traffic: Car,
  customer: User,
  general: FileEdit,
};

export default function SmartDocumentGenerator() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // الحالات
  const [step, setStep] = useState<ConversationStep>('welcome');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedDocument, setGeneratedDocument] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // التمرير التلقائي للرسائل
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // رسالة الترحيب
  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage(
        'مرحباً بك في مساعد الكتب الرسمية الذكي! 👋\n\nأنا هنا لمساعدتك في إنشاء الكتب الرسمية بسهولة وسرعة.\n\nاختر نوع الكتاب الذي تريد إنشاءه:'
      );
      setStep('category');
    }
  }, []);

  // إضافة رسالة من البوت
  const addBotMessage = (content: string, options?: string[], questionId?: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      options,
      questionId,
    };
    setMessages(prev => [...prev, message]);
  };

  // إضافة رسالة من المستخدم
  const addUserMessage = (content: string) => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  // اختيار الفئة
  const handleCategorySelect = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    addUserMessage(`${category.icon} ${category.name}`);
    setSelectedCategory(categoryId);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const templates = DOCUMENT_TEMPLATES.filter(t => t.category === categoryId);
      const templatesList = templates.map(t => `• ${t.name}`).join('\n');
      addBotMessage(
        `ممتاز! اخترت قسم ${category.name}.\n\nالكتب المتاحة:\n${templatesList}\n\nاختر الكتاب الذي تريد إنشاءه:`
      );
      setStep('template');
    }, 500);
  };

  // اختيار القالب
  const handleTemplateSelect = (templateId: string) => {
    const template = DOCUMENT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    addUserMessage(template.name);
    setSelectedTemplate(template);
    setCurrentQuestionIndex(0);
    setAnswers({});
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(
        `رائع! سأساعدك في إنشاء "${template.name}".\n\nسأطرح عليك بعض الأسئلة لجمع المعلومات المطلوبة. 📝`
      );
      
      setTimeout(() => {
        askQuestion(template.questions[0]);
        setStep('questions');
      }, 800);
    }, 500);
  };

  // طرح سؤال
  const askQuestion = (question: Question) => {
    const questionText = question.required 
      ? `${question.question} *` 
      : question.question;
    
    addBotMessage(
      questionText,
      question.type === 'select' ? question.options : undefined,
      question.id
    );
  };

  // الإجابة على السؤال
  const handleAnswer = (answer: string) => {
    if (!selectedTemplate) return;
    
    const currentQuestion = selectedTemplate.questions[currentQuestionIndex];
    addUserMessage(answer);
    
    // حفظ الإجابة
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));

    // الانتقال للسؤال التالي أو التوليد
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < selectedTemplate.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        askQuestion(selectedTemplate.questions[nextIndex]);
      }, 500);
    } else {
      // كل الأسئلة انتهت، نبدأ التوليد
      generateDocument();
    }
  };

  // إرسال الرسالة
  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    if (step === 'questions') {
      handleAnswer(inputValue.trim());
    }
    
    setInputValue('');
  };

  // توليد الكتاب
  const generateDocument = async () => {
    if (!selectedTemplate) return;
    
    setStep('generating');
    setIsGenerating(true);
    
    addBotMessage('جاري إنشاء الكتاب... ⏳\n\nيرجى الانتظار قليلاً بينما أقوم بصياغة الكتاب لك.');
    
    try {
      const result = await generateOfficialDocument(selectedTemplate, answers);
      
      if (result.success) {
        setGeneratedDocument(result.content);
        setStep('preview');
        addBotMessage('✅ تم إنشاء الكتاب بنجاح!\n\nيمكنك معاينة الكتاب وتحميله أو طباعته.');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'حدث خطأ أثناء إنشاء الكتاب',
        variant: 'destructive',
      });
      addBotMessage('❌ حدث خطأ أثناء إنشاء الكتاب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  // نسخ الكتاب
  const handleCopy = () => {
    if (generatedDocument) {
      // إزالة HTML tags للنسخ
      const textContent = generatedDocument.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ الكتاب إلى الحافظة',
      });
    }
  };

  // طباعة الكتاب
  const handlePrint = () => {
    if (generatedDocument) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="UTF-8">
            <title>كتاب رسمي - شركة العراف</title>
            <style>
              body {
                font-family: 'Arial', 'Tahoma', sans-serif;
                padding: 40px;
                max-width: 800px;
                margin: 0 auto;
                line-height: 1.8;
              }
              .letterhead {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .date {
                text-align: left;
                margin-bottom: 20px;
              }
              .recipient {
                margin-bottom: 20px;
              }
              .subject {
                font-weight: bold;
                text-decoration: underline;
                margin-bottom: 20px;
              }
              .body {
                text-align: justify;
                margin-bottom: 40px;
              }
              .signature {
                margin-top: 60px;
              }
              @media print {
                body { padding: 20px; }
              }
            </style>
          </head>
          <body>
            ${generatedDocument}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  // إعادة البدء
  const handleRestart = () => {
    setMessages([]);
    setStep('welcome');
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setGeneratedDocument(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950">
      <div className="container mx-auto p-4 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                مساعد الكتب الرسمية الذكي
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                أنشئ كتبك الرسمية بسهولة باستخدام الذكاء الاصطناعي
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-0">
              {/* Messages */}
              <ScrollArea className="h-[500px] p-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        'mb-4 flex',
                        message.type === 'user' ? 'justify-start' : 'justify-end'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3 shadow-md',
                          message.type === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none border'
                        )}
                      >
                        {message.type === 'bot' && (
                          <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                            <Sparkles className="h-4 w-4" />
                            <span className="text-xs font-medium">المساعد الذكي</span>
                          </div>
                        )}
                        <p className="whitespace-pre-line text-sm">{message.content}</p>
                        
                        {/* Options buttons for select questions */}
                        {message.options && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.options.map((option, i) => (
                              <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                onClick={() => handleAnswer(option)}
                                className="text-xs"
                              >
                                {option}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Typing indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end mb-4"
                  >
                    <div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-3 shadow-md border">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-xs text-gray-500">يكتب...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center py-8"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                      <p className="text-sm text-gray-600">جاري توليد الكتاب...</p>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </ScrollArea>

              {/* Category Selection */}
              {step === 'category' && (
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-2 gap-3">
                    {DOCUMENT_CATEGORIES.map((category) => {
                      const Icon = categoryIcons[category.id] || FileText;
                      return (
                        <Button
                          key={category.id}
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30"
                          onClick={() => handleCategorySelect(category.id)}
                        >
                          <span className="text-2xl">{category.icon}</span>
                          <span className="font-medium">{category.name}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Template Selection */}
              {step === 'template' && selectedCategory && (
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900/50">
                  <div className="grid grid-cols-1 gap-2">
                    {DOCUMENT_TEMPLATES
                      .filter(t => t.category === selectedCategory)
                      .map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          className="h-auto py-3 justify-start text-right hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-900/30"
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <FileText className="h-4 w-4 ml-2 text-indigo-600" />
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-xs text-gray-500">{template.description}</span>
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              {step === 'questions' && (
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900/50">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="اكتب إجابتك هنا..."
                      className="flex-1"
                    />
                    <Button onClick={handleSend} className="bg-indigo-600 hover:bg-indigo-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions after generation */}
              {step === 'preview' && (
                <div className="p-4 border-t bg-gray-50 dark:bg-slate-900/50">
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button onClick={handleCopy} variant="outline">
                      {copied ? <CheckCircle2 className="h-4 w-4 ml-2" /> : <Copy className="h-4 w-4 ml-2" />}
                      {copied ? 'تم النسخ' : 'نسخ'}
                    </Button>
                    <Button onClick={handlePrint} variant="outline">
                      <Printer className="h-4 w-4 ml-2" />
                      طباعة
                    </Button>
                    <Button onClick={handleRestart} variant="outline">
                      <RefreshCw className="h-4 w-4 ml-2" />
                      كتاب جديد
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                معاينة الكتاب
              </CardTitle>
              <CardDescription>
                سيظهر الكتاب هنا بعد إنشائه
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {generatedDocument ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none p-4 bg-white dark:bg-slate-900 rounded-lg border"
                    dangerouslySetInnerHTML={{ __html: generatedDocument }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
                    <Wand2 className="h-12 w-12 mb-4 opacity-50" />
                    <p>سيظهر الكتاب هنا</p>
                    <p className="text-xs">بعد الإجابة على جميع الأسئلة</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Progress indicator */}
        {selectedTemplate && step === 'questions' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    تقدم الأسئلة
                  </span>
                  <Badge variant="secondary">
                    {currentQuestionIndex + 1} / {selectedTemplate.questions.length}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

