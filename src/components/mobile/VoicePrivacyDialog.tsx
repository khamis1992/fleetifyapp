/**
 * Voice Privacy Dialog Component
 * Privacy consent dialog for voice input
 */

import React, { useState } from 'react';
import { Shield, Mic, Lock, Server, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { saveVoicePrivacyConsent } from '@/utils/voiceInputHelpers';

interface VoicePrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConsent: (granted: boolean) => void;
}

export function VoicePrivacyDialog({
  open,
  onOpenChange,
  onConsent,
}: VoicePrivacyDialogProps) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    saveVoicePrivacyConsent(true);
    onConsent(true);
    setAgreed(false); // Reset for next time
  };

  const handleDecline = () => {
    saveVoicePrivacyConsent(false);
    onConsent(false);
    setAgreed(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">سياسة الخصوصية للإدخال الصوتي</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Key Points */}
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Mic className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">معالجة الصوت المحلية</p>
                <p className="text-muted-foreground">
                  يتم معالجة الصوت محلياً في متصفحك باستخدام Web Speech API. لا يتم
                  إرسال التسجيلات الصوتية إلى خوادمنا.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">عدم التخزين</p>
                <p className="text-muted-foreground">
                  لا يتم تخزين التسجيلات الصوتية. يتم حذف البيانات الصوتية فور
                  تحويلها إلى نص.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Server className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">معالجة المتصفح</p>
                <p className="text-muted-foreground">
                  قد يستخدم متصفحك خدمات التعرف على الصوت من Google للمعالجة.
                  راجع{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    سياسة خصوصية Google
                  </a>{' '}
                  للمزيد من المعلومات.
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Information */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="data-collected">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  ما البيانات التي يتم جمعها؟
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>عند استخدام ميزة الإدخال الصوتي:</p>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>يتم التقاط الصوت مؤقتاً من خلال الميكروفون</li>
                  <li>يتم إرسال الصوت إلى خدمة التعرف على الكلام في المتصفح</li>
                  <li>يتم إرجاع النص المُحول فقط إلى التطبيق</li>
                  <li>لا يتم تخزين أي تسجيلات صوتية</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="data-usage">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  كيف يتم استخدام البيانات؟
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>النص المُحول من الصوت:</p>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>يُستخدم لملء حقول النماذج المطلوبة فقط</li>
                  <li>يتم تخزينه كجزء من بيانات النموذج (العقود، الملاحظات، إلخ)</li>
                  <li>لا يُستخدم لأي أغراض تحليلية أو تسويقية</li>
                  <li>يخضع لنفس سياسة الخصوصية الخاصة ببيانات التطبيق</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="permissions">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  ما الأذونات المطلوبة؟
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>للاستخدام، نحتاج إلى:</p>
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>
                    <strong>إذن الميكروفون:</strong> للتقاط الصوت أثناء التسجيل
                  </li>
                  <li>
                    <strong>Web Speech API:</strong> لتحويل الصوت إلى نص
                  </li>
                </ul>
                <p className="mt-2">
                  يمكنك إلغاء هذه الأذونات في أي وقت من إعدادات المتصفح.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  كيف نحمي بياناتك؟
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1 mr-4">
                  <li>جميع الاتصالات مشفرة باستخدام HTTPS</li>
                  <li>لا يتم تخزين التسجيلات الصوتية على خوادمنا</li>
                  <li>النص المُحول يخضع لمعايير أمان التطبيق</li>
                  <li>يمكنك حذف أي بيانات تم إدخالها في أي وقت</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <Checkbox
              id="voice-consent"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-1"
            />
            <Label
              htmlFor="voice-consent"
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              أوافق على استخدام ميزة الإدخال الصوتي وأفهم أن الصوت سيتم معالجته
              محلياً في المتصفح لتحويله إلى نص. أوافق على شروط سياسة الخصوصية
              المذكورة أعلاه.
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDecline}
            className="w-full sm:w-auto"
          >
            رفض
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={handleAccept}
            disabled={!agreed}
            className="w-full sm:w-auto"
          >
            أوافق وابدأ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
