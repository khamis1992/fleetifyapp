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
  ArrowRight
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import {
  DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
  generateOfficialDocument,
  DocumentTemplate,
  Question,
} from '@/services/ai/ZhipuAIService';

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  options?: string[];
}

type ConversationStep = 'welcome' | 'category' | 'template' | 'questions' | 'generating' | 'complete';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) {
      addBotMessage('مرحباً! 👋 أنا مساعدك لإنشاء الكتب الرسمية.\n\nاختر نوع الكتاب المطلوب:');
      setStep('category');
    }
  }, []);

  const addBotMessage = (content: string, options?: string[]) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date(),
      options,
    }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    }]);
  };

  const handleCategorySelect = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    addUserMessage(`${category.icon} ${category.name}`);
    setSelectedCategory(categoryId);
    
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(`اختر الكتاب من قسم ${category.name}:`);
      setStep('template');
    }, 400);
  };

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
      addBotMessage(`سأجمع المعلومات المطلوبة لـ "${template.name}"`);
      setTimeout(() => askQuestion(template.questions[0]), 500);
      setStep('questions');
    }, 400);
  };

  const askQuestion = (question: Question) => {
    const text = question.required ? `${question.question} *` : question.question;
    addBotMessage(text, question.type === 'select' ? question.options : undefined);
  };

  const handleAnswer = (answer: string) => {
    if (!selectedTemplate) return;
    
    const currentQuestion = selectedTemplate.questions[currentQuestionIndex];
    addUserMessage(answer);
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < selectedTemplate.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        askQuestion(selectedTemplate.questions[nextIndex]);
      }, 400);
    } else {
      generateDocument();
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    if (step === 'questions') handleAnswer(inputValue.trim());
    setInputValue('');
  };

  const generateDocument = async () => {
    if (!selectedTemplate) return;
    
    setStep('generating');
    setIsGenerating(true);
    addBotMessage('⏳ جاري إنشاء الكتاب...');
    
    try {
      const result = await generateOfficialDocument(selectedTemplate, answers);
      if (result.success) {
        setGeneratedDocument(result.content);
        setStep('complete');
        addBotMessage('✅ تم إنشاء الكتاب بنجاح!');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      addBotMessage('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedDocument) {
      const text = generatedDocument.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'تم النسخ', description: 'تم نسخ الكتاب إلى الحافظة' });
    }
  };

  const handlePrint = () => {
    if (generatedDocument) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generatedDocument);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleRestart = () => {
    setMessages([]);
    setStep('welcome');
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setGeneratedDocument(null);
  };

  const progress = selectedTemplate 
    ? ((currentQuestionIndex + 1) / selectedTemplate.questions.length) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-[#f0efed] dark:bg-[#1a1a1a]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-coral-500 to-orange-500 shadow-lg mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            مساعد الكتب الذكي
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            أنشئ كتبك الرسمية بسهولة
          </p>
        </motion.div>

        {/* Progress Bar */}
        {step === 'questions' && selectedTemplate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
              <span>السؤال {currentQuestionIndex + 1} من {selectedTemplate.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-coral-500 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Chat Container */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          
          {/* Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex',
                    message.type === 'user' ? 'justify-start' : 'justify-end'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3',
                      message.type === 'user'
                        ? 'bg-coral-500 text-white rounded-br-sm'
                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
                    )}
                  >
                    {message.type === 'bot' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-coral-500" />
                        <span className="text-[10px] font-medium text-coral-500">المساعد</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                    
                    {message.options && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.options.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnswer(option)}
                            className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-600 hover:bg-coral-50 hover:border-coral-300 dark:hover:bg-coral-900/20 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="bg-neutral-100 dark:bg-neutral-700 rounded-2xl px-4 py-3 rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-6">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
                  <p className="text-sm text-neutral-500">جاري التوليد...</p>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Category Selection */}
          {step === 'category' && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="grid grid-cols-2 gap-3">
                {DOCUMENT_CATEGORIES.map((category) => {
                  const Icon = categoryIcons[category.id] || FileText;
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-coral-900/20 transition-all group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{category.icon}</span>
                      <span className="font-medium text-sm text-neutral-900 dark:text-white">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Template Selection */}
          {step === 'template' && selectedCategory && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 max-h-[250px] overflow-y-auto">
              <div className="space-y-2">
                {DOCUMENT_TEMPLATES
                  .filter(t => t.category === selectedCategory)
                  .map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 hover:border-coral-400 hover:bg-coral-50 dark:hover:bg-coral-900/20 transition-all text-right group"
                    >
                      <FileText className="h-5 w-5 text-coral-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">{template.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{template.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-coral-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          {step === 'questions' && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اكتب إجابتك..."
                  className="flex-1 bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 focus:border-coral-400 focus:ring-coral-400"
                />
                <Button 
                  onClick={handleSend} 
                  className="bg-coral-500 hover:bg-coral-600 text-white px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Actions after completion */}
          {step === 'complete' && (
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  onClick={handlePrint} 
                  className="bg-coral-500 hover:bg-coral-600 text-white"
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة الكتاب
                </Button>
                <Button 
                  onClick={handleCopy} 
                  variant="outline"
                  className="border-coral-300 text-coral-600 hover:bg-coral-50"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 ml-2" /> : <Copy className="h-4 w-4 ml-2" />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </Button>
                <Button 
                  onClick={handleRestart} 
                  variant="outline"
                  className="border-neutral-300 hover:bg-neutral-100"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  كتاب جديد
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-neutral-400">
            💡 الكتب المُولّدة تستخدم الذكاء الاصطناعي لصياغة احترافية
          </p>
        </motion.div>
      </div>
    </div>
  );
}
