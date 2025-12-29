/**
 * مساعد الكتب الرسمية الذكي
 * Smart Official Document Generator
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  FileText, 
  Printer,
  Sparkles,
  Loader2,
  RefreshCw,
  Copy,
  CheckCircle2,
  Building2,
  Car,
  User,
  FileEdit,
  Bot,
  ChevronLeft,
  Eye
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
        addBotMessage('✅ تم إنشاء الكتاب بنجاح!\n\nاستخدم الأزرار أدناه لعرض أو طباعة الكتاب.');
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

  // فتح الكتاب في نافذة جديدة للطباعة
  const handlePrint = () => {
    if (generatedDocument) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generatedDocument);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }
  };

  // فتح الكتاب في نافذة جديدة للعرض
  const handleView = () => {
    if (generatedDocument) {
      const viewWindow = window.open('', '_blank');
      if (viewWindow) {
        viewWindow.document.write(generatedDocument);
        viewWindow.document.close();
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-card bg-card">
            <CardContent className="py-5 px-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary rounded-xl">
                  <Bot className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-foreground">
                    مساعد الكتب الرسمية
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    إنشاء الكتب الرسمية بالذكاء الاصطناعي
                  </p>
                </div>
                {step !== 'welcome' && step !== 'category' && (
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    بداية جديدة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Bar */}
        {selectedTemplate && step === 'questions' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-subtle bg-card">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    {selectedTemplate.name}
                  </span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                    {currentQuestionIndex + 1} / {selectedTemplate.questions.length}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="bg-primary h-full rounded-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Chat Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-elevated bg-card overflow-hidden">
            {/* Messages Area */}
            <div className="h-[450px] overflow-y-auto p-5 space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className={cn(
                      'flex',
                      message.type === 'user' ? 'justify-start' : 'justify-end'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-5 py-4 shadow-subtle',
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-accent/50 text-foreground rounded-bl-md border border-border/50'
                      )}
                    >
                      {message.type === 'bot' && (
                        <div className="flex items-center justify-end gap-2 mb-2 pb-2 border-b border-border/30">
                          <span className="text-xs font-semibold text-primary">المساعد الذكي</span>
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                          </div>
                        </div>
                      )}
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-right">{message.content}</p>
                      
                      {/* Options buttons */}
                      {message.options && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {message.options.map((option, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              onClick={() => handleAnswer(option)}
                              className="bg-card border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="bg-accent/50 border border-border/50 rounded-2xl rounded-bl-md px-5 py-4 shadow-subtle">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">يكتب...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Generating Spinner */}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center py-6"
                >
                  <div className="flex flex-col items-center gap-4 p-6 bg-accent/30 rounded-2xl border border-border/50">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-foreground font-medium">جاري إنشاء الكتاب...</p>
                      <p className="text-xs text-muted-foreground mt-1">يتم صياغة الكتاب بالذكاء الاصطناعي</p>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Category Selection */}
            {step === 'category' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-muted/30 border-t border-border"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {DOCUMENT_CATEGORIES.map((category) => {
                    const Icon = categoryIcons[category.id] || FileText;
                    return (
                      <motion.button
                        key={category.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleCategorySelect(category.id)}
                        className="group p-4 bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-xl transition-all duration-200 shadow-subtle hover:shadow-card"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                            {category.icon}
                          </span>
                          <span className="font-medium text-foreground text-sm">
                            {category.name}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Template Selection */}
            {step === 'template' && selectedCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-muted/30 border-t border-border"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {DOCUMENT_TEMPLATES
                    .filter(t => t.category === selectedCategory)
                    .map((template, index) => (
                      <motion.button
                        key={template.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleTemplateSelect(template.id)}
                        className="group flex items-center gap-3 p-4 bg-card hover:bg-primary/5 border border-border hover:border-primary/30 rounded-xl text-right transition-all duration-200 shadow-subtle hover:shadow-card"
                      >
                        <div className="p-2 bg-primary/10 group-hover:bg-primary/20 rounded-lg transition-colors">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-foreground block">
                            {template.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        </div>
                        <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.button>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Input Area */}
            {step === 'questions' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-muted/30 border-t border-border"
              >
                <div className="flex gap-3">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="اكتب إجابتك هنا..."
                    className="flex-1 bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 rounded-xl h-12"
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!inputValue.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 px-5 disabled:opacity-50 transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Actions after generation */}
            {step === 'preview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 bg-muted/30 border-t border-border"
              >
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button 
                    onClick={handleView}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-6"
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    عرض الكتاب
                  </Button>
                  <Button 
                    onClick={handlePrint}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6"
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                  <Button 
                    onClick={handleCopy} 
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted rounded-xl h-11 px-6"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" /> : <Copy className="h-4 w-4 ml-2" />}
                    {copied ? 'تم النسخ' : 'نسخ النص'}
                  </Button>
                  <Button 
                    onClick={handleRestart} 
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted rounded-xl h-11 px-6"
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    كتاب جديد
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <p className="text-muted-foreground text-sm">
            مدعوم بالذكاء الاصطناعي • شركة العراف لتأجير السيارات
          </p>
        </motion.div>
      </div>
    </div>
  );
}
