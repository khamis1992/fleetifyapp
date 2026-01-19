import React from 'react';
import { 
  HelpSection, 
  HelpStep, 
  HelpList, 
  HelpNote 
} from '../HelpContent';
import { 
  CreateContractHelp,
  RenewContractHelp,
  CancelContractHelp,
  ContractStatusHelp,
  ContractInvoicesHelp
} from './ContractsHelp';

export const ContractsPageHelpContent = () => (
  <>
    {/* نظرة عامة */}
    <HelpSection title="نظرة عامة على صفحة العقود' icon='info">
      <p>
        صفحة إدارة العقود هي قلب نظام إدارة الأسطول. من هنا يمكنك إنشاء عقود تأجير جديدة،
        متابعة العقود النشطة، تجديد العقود المنتهية، وإدارة جميع جوانب العقود.
      </p>
    </HelpSection>

    {/* الوظائف الرئيسية */}
    <HelpSection title="الوظائف الرئيسية' icon='check">
      <HelpList
        type='check'
        items={[
          'إنشاء عقود تأجير جديدة',
          'تجديد العقود المنتهية',
          'إلغاء العقود قبل انتهائها',
          'إدارة حالات العقود',
          'إنشاء وإدارة الفواتير',
          'إرسال تذكيرات للعملاء',
          'تصدير العقود والتقارير',
        ]}
      />
    </HelpSection>

    {/* إنشاء عقد */}
    <div className='border-t pt-6'>
      <h2 className='text-xl font-bold mb-4 text-blue-600'>إنشاء عقد جديد</h2>
      <CreateContractHelp />
    </div>

    {/* حالات العقد */}
    <div className='border-t pt-6'>
      <h2 className='text-xl font-bold mb-4 text-blue-600'>حالات العقد</h2>
      <ContractStatusHelp />
    </div>

    {/* تجديد العقد */}
    <div className='border-t pt-6'>
      <h2 className='text-xl font-bold mb-4 text-blue-600'>تجديد العقد</h2>
      <RenewContractHelp />
    </div>

    {/* إلغاء العقد */}
    <div className='border-t pt-6'>
      <h2 className='text-xl font-bold mb-4 text-blue-600'>إلغاء العقد</h2>
      <CancelContractHelp />
    </div>

    {/* الفواتير */}
    <div className='border-t pt-6'>
      <h2 className='text-xl font-bold mb-4 text-blue-600'>فواتير العقد</h2>
      <ContractInvoicesHelp />
    </div>

    {/* التبويبات */}
    <div className='border-t pt-6'>
      <HelpSection title="فهم التبويبات' icon='info">
        <p className='mb-3'>
          الصفحة مقسمة إلى عدة تبويبات لتسهيل التنقل:
        </p>
        <div className='space-y-3'>
          <div className='p-3 bg-slate-50 rounded-lg'>
            <h4 className='font-bold mb-1'>الكل</h4>
            <p className='text-sm text-slate-700'>
              عرض جميع العقود بغض النظر عن حالتها.
            </p>
          </div>
          <div className='p-3 bg-green-50 rounded-lg'>
            <h4 className='font-bold text-green-900 mb-1'>النشطة</h4>
            <p className='text-sm text-green-800'>
              العقود السارية حالياً والتي تحتاج متابعة.
            </p>
          </div>
          <div className='p-3 bg-orange-50 rounded-lg'>
            <h4 className='font-bold text-orange-900 mb-1'>التنبيهات</h4>
            <p className='text-sm text-orange-800'>
              العقود القاربة على الانتهاء أو التي تحتاج انتباهك.
            </p>
          </div>
          <div className='p-3 bg-red-50 rounded-lg'>
            <h4 className='font-bold text-red-900 mb-1'>الملغاة</h4>
            <p className='text-sm text-red-800'>
              العقود التي تم إلغاؤها قبل انتهاء مدتها.
            </p>
          </div>
        </div>
      </HelpSection>
    </div>

    {/* البحث والفلترة */}
    <div className='border-t pt-6'>
      <HelpSection title="البحث والفلترة' icon='tip">
        <p className='mb-3'>
          يمكنك البحث عن العقود باستخدام:
        </p>
        <HelpList
          type='check'
          items={[
            'رقم العقد',
            'اسم العميل',
            'رقم المركبة (اللوحة)',
            'نوع العقد',
            'حالة العقد',
            'تاريخ البداية أو الانتهاء',
          ]}
        />
        <p className='mt-3 text-sm text-slate-600'>
          النتائج تظهر فوراً أثناء الكتابة.
        </p>
      </HelpSection>
    </div>

    {/* الإحصائيات */}
    <div className='border-t pt-6'>
      <HelpSection title="فهم الإحصائيات' icon='info">
        <p className='mb-3'>
          في أعلى الصفحة، ستجد إحصائيات مهمة:
        </p>
        <HelpList
          items={[
            'إجمالي العقود: العدد الكلي لجميع العقود',
            'العقود النشطة: العقود السارية حالياً',
            'العقود المنتهية قريباً: تحتاج تجديد أو إنهاء',
            'إجمالي الإيرادات: مجموع قيم العقود النشطة',
          ]}
        />
      </HelpSection>
    </div>

    {/* الإجراءات السريعة */}
    <div className='border-t pt-6'>
      <HelpSection title="الإجراءات السريعة' icon='check">
        <p className='mb-3'>
          من قائمة الإجراءات (⋮) بجانب كل عقد، يمكنك:
        </p>
        <HelpList
          type='check'
          items={[
            'عرض التفاصيل الكاملة',
            'تعديل العقد',
            'تجديد العقد',
            'إلغاء العقد',
            'إنشاء فاتورة',
            'طباعة العقد',
            'إرسال تذكير للعميل',
          ]}
        />
      </HelpSection>
    </div>

    {/* نصائح */}
    <div className='border-t pt-6'>
      <HelpNote type='tip'>
        <strong>نصائح للاستخدام الأمثل:</strong>
        <ul className='mt-2 space-y-1 text-sm'>
          <li>• راجع تبويب 'التنبيهات' يومياً للعقود التي تحتاج انتباهك</li>
          <li>• فعّل التجديد التلقائي للعقود المتكررة</li>
          <li>• تأكد من تسجيل جميع الشروط الخاصة في العقد</li>
          <li>• استخدم الملاحظات لتوثيق أي تفاصيل مهمة</li>
          <li>• راجع الفواتير بانتظام للتأكد من السداد</li>
        </ul>
      </HelpNote>
    </div>

    {/* تحذيرات */}
    <div className='border-t pt-6'>
      <HelpNote type='warning'>
        <strong>تحذيرات مهمة:</strong>
        <ul className='mt-2 space-y-1 text-sm'>
          <li>• لا يمكن حذف عقد نشط، يجب إلغاؤه أولاً</li>
          <li>• إلغاء العقد قد يترتب عليه غرامات حسب الشروط</li>
          <li>• تأكد من تسوية جميع المستحقات قبل إنهاء العقد</li>
          <li>• العقود الملغاة لا يمكن إعادة تفعيلها</li>
        </ul>
      </HelpNote>
    </div>
  </>
);
