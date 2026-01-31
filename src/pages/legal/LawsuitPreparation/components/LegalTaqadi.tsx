/**
 * LegalTaqadi Component - Court System Data Display
 * مكون بيانات تقاضي - عرض بيانات نظام المحاكم
 * 
 * Displays organized Taqadi data with copy-to-clipboard functionality
 * in a professional legal theme with dark slate background.
 */

import { motion } from 'framer-motion';
import { useState } from 'react';
import { 
  Gavel, 
  Copy, 
  Check, 
  FileText, 
  User, 
  Car, 
  Calendar,
  CreditCard,
  Hash,
  Globe,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Link2,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLawsuitPreparationContext } from '../store';
import { toast } from 'sonner';

// ==========================================
// Copyable Field Component
// ==========================================

interface CopyableFieldProps {
  label: string;
  value: string;
  fieldId: string;
  icon?: React.ReactNode;
  isMultiline?: boolean;
  className?: string;
}

function CopyableField({ 
  label, 
  value, 
  fieldId, 
  icon, 
  isMultiline = false,
  className = ''
}: CopyableFieldProps) {
  const { state, actions } = useLawsuitPreparationContext();
  const isCopied = state.ui.copiedField === fieldId;
  const displayValue = value || 'غير محدد';
  
  return (
    <div
      className={`
        group relative p-4 bg-slate-100 rounded-xl
        border border-slate-200 hover:border-slate-300
        transition-all duration-200
        ${isMultiline ? '' : 'flex items-center justify-between'}
        ${className}
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-teal-600/70">{icon}</span>}
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">{label}</p>
        </div>
        <p
          className={`
            text-slate-900 font-semibold
            ${isMultiline ? 'text-sm whitespace-pre-wrap leading-relaxed' : 'text-base truncate'}
          `}
          dir="auto"
        >
          {displayValue}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => actions.copyToClipboard(value || '', fieldId)}
        className={`
          flex-shrink-0 mr-2 opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          ${isCopied ? 'opacity-100' : ''}
          hover:bg-slate-200 text-slate-500 hover:text-slate-800
        `}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// ==========================================
// Section Card Component
// ==========================================

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

function SectionCard({ title, icon, children, delay = 0 }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-slate-50 border-slate-200 overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-200 bg-white">
          <CardTitle className="text-lg flex items-center gap-3 text-slate-900">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600/20 to-teal-700/20
                          border border-teal-600/30 flex items-center justify-center">
              {icon}
            </div>
            <span className="font-bold">{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==========================================
// Main Component
// ==========================================

export function LegalTaqadi() {
  const { state } = useLawsuitPreparationContext();
  const { taqadiData } = state;
  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);
  const [bookmarkletCopied, setBookmarkletCopied] = useState(false);

  // Function to save Taqadi data to localStorage
  const saveTaqadiDataToLocalStorage = () => {
    if (!taqadiData) {
      toast.error('لا توجد بيانات تقاضي متاحة');
      return;
    }

    try {
      const dataToSave = {
        title: taqadiData.caseTitle,
        facts: taqadiData.facts,
        claims: taqadiData.claims,
        amount: taqadiData.amount,
        amountInWords: taqadiData.amountInWords,
        defendant: {
          fullName: taqadiData.defendant.fullName,
          firstName: taqadiData.defendant.firstName,
          middleName: taqadiData.defendant.middleName,
          lastName: taqadiData.defendant.lastName,
          idNumber: taqadiData.defendant.idNumber,
          idType: taqadiData.defendant.idType,
          nationality: taqadiData.defendant.nationality,
          phone: taqadiData.defendant.phone,
          email: taqadiData.defendant.email,
          address: taqadiData.defendant.address,
        },
        contract: taqadiData.contract,
        vehicle: taqadiData.vehicle,
        timestamp: Date.now(),
      };

      localStorage.setItem('alarafLawsuitDataFull', JSON.stringify(dataToSave));
      setShowBookmarkletModal(true);
      toast.success('✅ تم حفظ بيانات التقاضي بنجاح');
    } catch (error) {
      console.error('Error saving Taqadi data:', error);
      toast.error('❌ فشل في حفظ البيانات');
    }
  };

  // Generate bookmarklet JavaScript code
  const generateBookmarkletCode = (): string => {
    return `javascript:(function(){'use strict';const dataStr=localStorage.getItem('alarafLawsuitDataFull');if(!dataStr){alert('❌ لم يتم العثور على بيانات الدعوى!\\n\\nيرجى الذهاب إلى صفحة تجهيز الدعوى في العراف والضغط على زر "نسخ بيانات التقاضي" أولاً.');return;}let data;try{data=JSON.parse(dataStr);}catch(e){alert('❌ خطأ في قراءة البيانات!');return;}console.log('📋 بيانات الدعوى:',data);function fillField(selectors,value,fieldName){if(!value)return false;for(const selector of selectors){const elements=document.querySelectorAll(selector);for(const el of elements){if(el&&(el.tagName==='INPUT'||el.tagName==='TEXTAREA')){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));console.log('✅ '+fieldName+': تم الملء بنجاح');return true;}}}return false;}function fillByLabel(labelText,value,fieldName){if(!value)return false;const labels=document.querySelectorAll('label');for(const label of labels){if(label.textContent.includes(labelText)){const forId=label.getAttribute('for');if(forId){const input=document.getElementById(forId);if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));console.log('✅ '+fieldName+': تم الملء بنجاح (via label)');return true;}}const nextInput=label.nextElementSibling;if(nextInput&&(nextInput.tagName==='INPUT'||nextInput.tagName==='TEXTAREA')){nextInput.value=value;nextInput.dispatchEvent(new Event('input',{bubbles:true}));nextInput.dispatchEvent(new Event('change',{bubbles:true}));console.log('✅ '+fieldName+': تم الملء بنجاح (via sibling)');return true;}const parent=label.parentElement;if(parent){const input=parent.querySelector('input, textarea');if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));console.log('✅ '+fieldName+': تم الملء بنجاح (via parent)');return true;}}}return false;}function fillByPlaceholder(placeholderText,value,fieldName){if(!value)return false;const inputs=document.querySelectorAll('input, textarea');for(const input of inputs){const placeholder=input.getAttribute('placeholder')||'';if(placeholder.includes(placeholderText)){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));console.log('✅ '+fieldName+': تم الملء بنجاح (via placeholder)');return true;}}return false;}let filledCount=0;if(fillByLabel('عنوان',data.title,'عنوان الدعوى')||fillByPlaceholder('عنوان',data.title,'عنوان الدعوى')||fillField(['input[name*="title"]','input[name*="subject"]','#title','#subject'],data.title,'عنوان الدعوى')){filledCount++;}if(fillByLabel('وقائع',data.facts,'الوقائع')||fillByLabel('الوقائع',data.facts,'الوقائع')||fillByPlaceholder('وقائع',data.facts,'الوقائع')||fillField(['textarea[name*="fact"]','textarea[name*="detail"]','#facts','#details'],data.facts,'الوقائع')){filledCount++;}if(fillByLabel('طلبات',data.claims,'الطلبات')||fillByLabel('الطلبات',data.claims,'الطلبات')||fillByPlaceholder('طلبات',data.claims,'الطلبات')||fillField(['textarea[name*="claim"]','textarea[name*="request"]','#claims','#requests'],data.claims,'الطلبات')){filledCount++;}if(fillByLabel('مبلغ',data.amount,'المبلغ')||fillByLabel('المبلغ',data.amount,'المبلغ')||fillByPlaceholder('مبلغ',data.amount,'المبلغ')||fillField(['input[name*="amount"]','input[name*="value"]','input[type="number"]','#amount'],data.amount,'المبلغ')){filledCount++;}if(fillByLabel('كتابة',data.amountInWords,'المبلغ كتابة')||fillByLabel('بالحروف',data.amountInWords,'المبلغ كتابة')||fillByPlaceholder('كتابة',data.amountInWords,'المبلغ كتابة')||fillField(['input[name*="word"]','input[name*="text"]','#amountWords'],data.amountInWords,'المبلغ كتابة')){filledCount++;}if(filledCount>0){alert('✅ تم ملء '+filledCount+' حقول بنجاح!\\n\\nيرجى مراجعة البيانات والتأكد من صحتها قبل الإرسال.\\n\\n📋 البيانات:\\n- العنوان: '+(data.title||'غير متوفر')+'\\n- المبلغ: '+(data.amount||'غير متوفر'));}else{const copyText='عنوان الدعوى:\\n'+data.title+'\\n\\nالوقائع:\\n'+data.facts+'\\n\\nالطلبات:\\n'+data.claims+'\\n\\nالمبلغ:\\n'+data.amount+'\\n\\nالمبلغ كتابة:\\n'+data.amountInWords;const result=confirm('⚠️ لم يتم التعرف على حقول النموذج تلقائياً.\\n\\nهل تريد نسخ البيانات للصق اليدوي؟');if(result){navigator.clipboard.writeText(copyText).then(()=>{alert('✅ تم نسخ البيانات!\\n\\nيمكنك الآن لصقها في الحقول المناسبة.');}).catch(()=>{const textarea=document.createElement('textarea');textarea.value=copyText;document.body.appendChild(textarea);textarea.select();document.execCommand('copy');document.body.removeChild(textarea);alert('✅ تم نسخ البيانات!\\n\\nيمكنك الآن لصقها في الحقول المناسبة.');});}}console.log('🏁 انتهى تنفيذ Bookmarklet');})();`;
  };

  // Function to copy bookmarklet code
  const copyBookmarkletCode = () => {
    const bookmarkletCode = generateBookmarkletCode();
    navigator.clipboard.writeText(bookmarkletCode).then(() => {
      setBookmarkletCopied(true);
      toast.success('✅ تم نسخ الكود بنجاح');
      setTimeout(() => setBookmarkletCopied(false), 3000);
    }).catch(() => {
      toast.error('❌ فشل في النسخ');
    });
  };
  
  if (!taqadiData) {
    return (
      <div className="p-8 text-center text-slate-600">
        <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>جاري تحميل بيانات التقاضي...</p>
      </div>
    );
  }
  
  const { caseTitle, facts, claims, amount, amountInWords, defendant, contract, vehicle } = taqadiData;
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600/20 to-teal-700/20
                       border border-teal-600/30 flex items-center justify-center shadow-lg shadow-teal-600/10">
          <Gavel className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">بيانات نظام التقاضي</h2>
          <p className="text-slate-600 text-sm">بيانات جاهزة للنسخ إلى نظام المحاكم الإلكتروني</p>
        </div>
      </motion.div>
      
      {/* Case Data Section */}
      <SectionCard
        title="بيانات الدعوى"
        icon={<FileText className="h-5 w-5 text-teal-600" />}
        delay={0.1}
      >
        <CopyableField
          label="عنوان الدعوى"
          value={caseTitle}
          fieldId="case-title"
          icon={<Briefcase className="h-4 w-4" />}
        />
        
        <CopyableField
          label="الوقائع"
          value={facts}
          fieldId="case-facts"
          icon={<FileText className="h-4 w-4" />}
          isMultiline
        />
        
        <CopyableField
          label="الطلبات / المطالبات"
          value={claims}
          fieldId="case-claims"
          icon={<Gavel className="h-4 w-4" />}
          isMultiline
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="المبلغ المطالب به"
            value={`${Math.round(amount)} QAR`}
            fieldId="case-amount"
            icon={<CreditCard className="h-4 w-4" />}
          />
          <CopyableField
            label="المبلغ كتابةً"
            value={amountInWords}
            fieldId="case-amount-words"
            icon={<FileText className="h-4 w-4" />}
          />
        </div>
      </SectionCard>
      
      {/* Defendant Data Section */}
      <SectionCard
        title="بيانات المدعى عليه"
        icon={<User className="h-5 w-5 text-teal-600" />}
        delay={0.2}
      >
        <CopyableField
          label="الاسم الكامل"
          value={defendant.fullName}
          fieldId="defendant-fullname"
          icon={<User className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CopyableField
            label="الاسم الأول"
            value={defendant.firstName || ''}
            fieldId="defendant-firstname"
          />
          <CopyableField
            label="الاسم الأوسط"
            value={defendant.middleName || ''}
            fieldId="defendant-middlename"
          />
          <CopyableField
            label="اسم العائلة"
            value={defendant.lastName || ''}
            fieldId="defendant-lastname"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="رقم الهوية / جواز السفر"
            value={defendant.idNumber || ''}
            fieldId="defendant-id"
            icon={<Hash className="h-4 w-4" />}
          />
          <CopyableField
            label="نوع الهوية"
            value={defendant.idType || ''}
            fieldId="defendant-id-type"
            icon={<CreditCard className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="الجنسية"
          value={defendant.nationality || ''}
          fieldId="defendant-nationality"
          icon={<Globe className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="رقم الهاتف"
            value={defendant.phone || ''}
            fieldId="defendant-phone"
            icon={<Phone className="h-4 w-4" />}
          />
          <CopyableField
            label="البريد الإلكتروني"
            value={defendant.email || ''}
            fieldId="defendant-email"
            icon={<Mail className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="العنوان"
          value={defendant.address || ''}
          fieldId="defendant-address"
          icon={<MapPin className="h-4 w-4" />}
          isMultiline
        />
      </SectionCard>
      
      {/* Contract Data Section */}
      <SectionCard
        title="بيانات العقد"
        icon={<Briefcase className="h-5 w-5 text-teal-600" />}
        delay={0.3}
      >
        <CopyableField
          label="رقم العقد"
          value={contract.contractNumber}
          fieldId="contract-number"
          icon={<Hash className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="تاريخ بدء العقد"
            value={new Date(contract.startDate).toLocaleDateString('ar-QA')}
            fieldId="contract-start"
            icon={<Calendar className="h-4 w-4" />}
          />
          <CopyableField
            label="تاريخ انتهاء العقد"
            value={contract.endDate 
              ? new Date(contract.endDate).toLocaleDateString('ar-QA')
              : 'غير محدد'
            }
            fieldId="contract-end"
            icon={<Calendar className="h-4 w-4" />}
          />
        </div>
        
        <CopyableField
          label="القيمة الإيجارية الشهرية"
          value={contract.monthlyAmount 
            ? `${Math.round(contract.monthlyAmount)} QAR`
            : 'غير محدد'
          }
          fieldId="contract-monthly"
          icon={<CreditCard className="h-4 w-4" />}
        />
      </SectionCard>
      
      {/* Vehicle Data Section */}
      <SectionCard
        title="بيانات السيارة"
        icon={<Car className="h-5 w-5 text-teal-600" />}
        delay={0.4}
      >
        <CopyableField
          label="الوصف الكامل"
          value={vehicle.fullDescription}
          fieldId="vehicle-full"
          icon={<Car className="h-4 w-4" />}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CopyableField
            label="الماركة"
            value={vehicle.make || ''}
            fieldId="vehicle-make"
          />
          <CopyableField
            label="الموديل"
            value={vehicle.model || ''}
            fieldId="vehicle-model"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CopyableField
            label="سنة الصنع"
            value={vehicle.year ? String(vehicle.year) : ''}
            fieldId="vehicle-year"
          />
          <CopyableField
            label="رقم اللوحة"
            value={vehicle.plateNumber || ''}
            fieldId="vehicle-plate"
          />
          <CopyableField
            label="اللون"
            value={vehicle.color || ''}
            fieldId="vehicle-color"
          />
        </div>
        
        <CopyableField
          label="رقم الشاسيه (VIN)"
          value={vehicle.vin || ''}
          fieldId="vehicle-vin"
          icon={<Hash className="h-4 w-4" />}
        />
      </SectionCard>
      
      {/* Taqadi Bookmarklet Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="pt-4"
      >
        <Button
          size="lg"
          onClick={saveTaqadiDataToLocalStorage}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg shadow-lg shadow-blue-600/25"
        >
          <Link2 className="h-5 w-5 ml-3" />
          نسخ بيانات التقاضي
        </Button>
      </motion.div>

      {/* Bookmarklet Modal */}
      <Dialog open={showBookmarkletModal} onOpenChange={setShowBookmarkletModal}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-600" />
              رفع تلقائي إلى تقاضي
            </DialogTitle>
            <DialogDescription>
              تم حفظ بيانات الدعوى. اتبع الخطوات التالية لفتح القضية على موقع تقاضي.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Step 1 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-900">الخطوة 1: اسحب الزر إلى المفضلة</h4>
              <p className="text-xs text-slate-600">
                اسحب هذا الزر إلى شريط المفضلة (Bookmarks) في متصفحك
              </p>
              <a
                href={generateBookmarkletCode()}
                onClick={(e) => {
                  e.preventDefault();
                  alert('اسحب هذا الزر إلى شريط المفضلة في متصفحك');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg cursor-move hover:shadow-lg transition-all"
                draggable
              >
                <span className="text-lg">🚀</span>
                <span className="font-medium">ملء تقاضي - العراف</span>
              </a>
            </div>

            {/* Step 2 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-900">الخطوة 2: افتح موقع تقاضي</h4>
              <p className="text-xs text-slate-600">
                انتقل إلى{' '}
                <a 
                  href="https://taqadi.sjc.gov.qa/itc/login" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  taqadi.sjc.gov.qa
                </a>{' '}
                وسجل الدخول
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-slate-900">الخطوة 3: اضغط على الـ Bookmarklet</h4>
              <p className="text-xs text-slate-600">
                بعد فتح نموذج إنشاء دعوى، اضغط على "ملء تقاضي - العراف" في المفضلة
              </p>
            </div>

            {/* Alternative: Copy Code */}
            <div className="pt-2 border-t border-slate-200">
              <Button
                onClick={copyBookmarkletCode}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {bookmarkletCopied ? (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2 text-emerald-500" />
                    تم النسخ!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 ml-2" />
                    نسخ كود Bookmarklet
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LegalTaqadi;
