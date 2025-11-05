import React from 'react';
import { 
  HelpSection, 
  HelpStep, 
  HelpList, 
  HelpNote 
} from '../HelpContent';
import { 
  AddCustomerHelp,
  EditCustomerHelp,
  DeleteCustomerHelp,
  SearchCustomerHelp,
  CustomerTypesHelp
} from './CustomersHelp';

export const CustomersPageHelpContent = () => (
  <>
    {/* نظرة عامة */}
    <HelpSection title="نظرة عامة على صفحة العملاء" icon="info">
      <p>
        صفحة إدارة العملاء هي المركز الرئيسي لإدارة جميع عملاء النظام، سواء كانوا أفراداً أو شركات.
        من هنا يمكنك إضافة عملاء جدد، تعديل بياناتهم، البحث عنهم، وإدارة جميع المعلومات المتعلقة بهم.
      </p>
    </HelpSection>

    {/* الوظائف الرئيسية */}
    <HelpSection title="الوظائف الرئيسية" icon="check">
      <HelpList
        type="check"
        items={[
          'إضافة عملاء جدد (أفراد أو شركات)',
          'البحث والفلترة السريعة',
          'تعديل بيانات العملاء',
          'عرض تفاصيل العميل الكاملة',
          'إدارة العقود المرتبطة بالعميل',
          'تصدير قائمة العملاء',
          'استيراد عملاء من ملف CSV',
        ]}
      />
    </HelpSection>

    {/* إضافة عميل */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">إضافة عميل جديد</h2>
      <AddCustomerHelp />
    </div>

    {/* البحث */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">البحث عن عميل</h2>
      <SearchCustomerHelp />
    </div>

    {/* أنواع العملاء */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">أنواع العملاء</h2>
      <CustomerTypesHelp />
    </div>

    {/* تعديل */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">تعديل بيانات عميل</h2>
      <EditCustomerHelp />
    </div>

    {/* حذف */}
    <div className="border-t pt-6">
      <h2 className="text-xl font-bold mb-4 text-blue-600">حذف عميل</h2>
      <DeleteCustomerHelp />
    </div>

    {/* الإحصائيات */}
    <div className="border-t pt-6">
      <HelpSection title="فهم الإحصائيات" icon="info">
        <p className="mb-3">
          في أعلى الصفحة، ستجد بطاقات إحصائية توضح:
        </p>
        <HelpList
          items={[
            'إجمالي العملاء: العدد الكلي لجميع العملاء في النظام',
            'العملاء الأفراد: عدد العملاء من نوع &quot;فرد&quot;',
            'العملاء المؤسسيين: عدد العملاء من نوع &quot;شركة&quot;',
            'القائمة السوداء: عدد العملاء المحظورين',
          ]}
        />
      </HelpSection>
    </div>

    {/* الفلاتر */}
    <div className="border-t pt-6">
      <HelpSection title="استخدام الفلاتر" icon="tip">
        <p className="mb-3">
          يمكنك تصفية العملاء حسب:
        </p>
        <HelpList
          type="check"
          items={[
            'نوع العميل (الكل / فرد / شركة)',
            'الحالة (نشط / غير نشط)',
            'القائمة السوداء',
          ]}
        />
        <p className="mt-3 text-sm text-gray-600">
          الفلاتر تعمل فوراً دون الحاجة للضغط على أي زر.
        </p>
      </HelpSection>
    </div>

    {/* التصدير والاستيراد */}
    <div className="border-t pt-6">
      <HelpSection title="التصدير والاستيراد" icon="info">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">تصدير العملاء</h4>
            <p className="text-sm text-gray-700&quot;>
              انقر على زر &quot;تصدير" لتحميل قائمة العملاء كملف CSV. يمكنك فتحه في Excel أو Google Sheets.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">استيراد العملاء</h4>
            <p className="text-sm text-gray-700&quot;>
              يمكنك استيراد عملاء متعددين دفعة واحدة من ملف CSV. انقر على &quot;استيراد" واتبع التعليمات.
            </p>
          </div>
        </div>
      </HelpSection>
    </div>

    {/* نصائح */}
    <div className="border-t pt-6">
      <HelpNote type="tip">
        <strong>نصائح للاستخدام الأمثل:</strong>
        <ul className="mt-2 space-y-1 text-sm">
          <li>• استخدم البحث السريع للعثور على العملاء بسرعة</li>
          <li>• تأكد من إدخال بيانات التواصل بشكل صحيح</li>
          <li>• راجع بيانات العميل قبل إنشاء عقد له</li>
          <li>• استخدم الملاحظات لتسجيل معلومات مهمة عن العميل</li>
        </ul>
      </HelpNote>
    </div>
  </>
);
