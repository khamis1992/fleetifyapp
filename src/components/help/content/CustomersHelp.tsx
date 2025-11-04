import React from 'react';
import { HelpSection, HelpStep, HelpList, HelpNote } from '../HelpContent';

export const AddCustomerHelp = () => (
  <>
    <HelpSection title="ما هي إضافة عميل جديد؟" icon="info">
      <p>
        إضافة عميل جديد تتيح لك تسجيل بيانات العملاء (أفراد أو شركات) في النظام لاستخدامها في العقود والفواتير والمعاملات المالية.
      </p>
    </HelpSection>

    <HelpSection title="خطوات إضافة عميل جديد" icon="check">
      <div className="space-y-4">
        <HelpStep
          number={1}
          title="انقر على زر 'إضافة عميل'"
          description="ستجد الزر في أعلى صفحة العملاء، انقر عليه لفتح نموذج إضافة عميل جديد."
        />
        <HelpStep
          number={2}
          title="اختر نوع العميل"
          description="حدد ما إذا كان العميل فرد (Individual) أو شركة (Corporate). هذا يحدد الحقول المطلوبة."
        />
        <HelpStep
          number={3}
          title="أدخل البيانات الأساسية"
          description="املأ الحقول المطلوبة مثل الاسم، رقم الهاتف، البريد الإلكتروني، والعنوان."
        />
        <HelpStep
          number={4}
          title="أدخل البيانات الإضافية (اختياري)"
          description="يمكنك إضافة معلومات إضافية مثل رقم الهوية، رقم السجل التجاري، وملاحظات."
        />
        <HelpStep
          number={5}
          title="احفظ البيانات"
          description="انقر على زر "حفظ" لإضافة العميل إلى النظام."
        />
      </div>
    </HelpSection>

    <HelpSection title="الحقول المطلوبة" icon="alert">
      <HelpList
        type="check"
        items={[
          'الاسم الكامل (إلزامي)',
          'رقم الهاتف (إلزامي)',
          'نوع العميل: فرد أو شركة (إلزامي)',
          'البريد الإلكتروني (اختياري ولكن مُوصى به)',
          'العنوان (اختياري)',
        ]}
      />
    </HelpSection>

    <HelpNote type="tip">
      <strong>نصيحة:</strong> تأكد من إدخال رقم هاتف صحيح لأنه سيُستخدم في التواصل وإرسال الإشعارات.
    </HelpNote>

    <HelpNote type="warning">
      <strong>تنبيه:</strong> لا يمكن حذف عميل له عقود نشطة. يجب إلغاء أو إنهاء جميع العقود أولاً.
    </HelpNote>
  </>
);

export const EditCustomerHelp = () => (
  <>
    <HelpSection title="تعديل بيانات عميل" icon="info">
      <p>
        يمكنك تعديل بيانات أي عميل في أي وقت. التعديلات ستنعكس تلقائياً على جميع العقود والفواتير المرتبطة بهذا العميل.
      </p>
    </HelpSection>

    <HelpSection title="خطوات التعديل" icon="check">
      <div className="space-y-4">
        <HelpStep
          number={1}
          title="ابحث عن العميل"
          description="استخدم حقل البحث للعثور على العميل المطلوب."
        />
        <HelpStep
          number={2}
          title="انقر على زر 'تعديل'"
          description="ستجد زر التعديل (قلم) بجانب اسم العميل في الجدول."
        />
        <HelpStep
          number={3}
          title="عدّل البيانات"
          description="قم بتعديل الحقول المطلوبة في النموذج."
        />
        <HelpStep
          number={4}
          title="احفظ التغييرات"
          description="انقر على "حفظ" لتطبيق التعديلات."
        />
      </div>
    </HelpSection>

    <HelpNote type="info">
      <strong>ملاحظة:</strong> التعديلات على بيانات العميل لا تؤثر على العقود السابقة، ولكنها ستظهر في العقود الجديدة والتقارير المستقبلية.
    </HelpNote>
  </>
);

export const DeleteCustomerHelp = () => (
  <>
    <HelpSection title="حذف عميل" icon="alert">
      <p>
        حذف العميل يزيل جميع بياناته من النظام بشكل نهائي. هذا الإجراء <strong>لا يمكن التراجع عنه</strong>.
      </p>
    </HelpSection>

    <HelpSection title="متى يمكن حذف عميل؟" icon="check">
      <HelpList
        items={[
          'لا يوجد للعميل أي عقود نشطة',
          'لا يوجد للعميل أي مدفوعات معلقة',
          'لا يوجد للعميل أي قضايا قانونية مفتوحة',
        ]}
      />
    </HelpSection>

    <HelpNote type="warning">
      <strong>تحذير:</strong> إذا كان للعميل عقود أو معاملات سابقة، يُنصح بـ "تعطيل" العميل بدلاً من حذفه للحفاظ على السجلات التاريخية.
    </HelpNote>
  </>
);

export const SearchCustomerHelp = () => (
  <>
    <HelpSection title="البحث عن عميل" icon="info">
      <p>
        يمكنك البحث عن العملاء باستخدام عدة معايير للعثور على العميل المطلوب بسرعة.
      </p>
    </HelpSection>

    <HelpSection title="طرق البحث المتاحة" icon="check">
      <HelpList
        type="check"
        items={[
          'البحث بالاسم (كامل أو جزئي)',
          'البحث برقم الهاتف',
          'البحث بالبريد الإلكتروني',
          'البحث برقم الهوية أو السجل التجاري',
          'الفلترة حسب نوع العميل (فرد/شركة)',
          'الفلترة حسب الحالة (نشط/غير نشط)',
        ]}
      />
    </HelpSection>

    <HelpNote type="tip">
      <strong>نصيحة:</strong> النتائج تظهر فوراً أثناء الكتابة، لا حاجة للضغط على زر البحث.
    </HelpNote>
  </>
);

export const CustomerTypesHelp = () => (
  <>
    <HelpSection title="أنواع العملاء" icon="info">
      <p>
        النظام يدعم نوعين من العملاء، لكل نوع متطلبات وحقول مختلفة.
      </p>
    </HelpSection>

    <HelpSection title="عميل فردي (Individual)" icon="check">
      <p className="mb-2">مناسب للأفراد والعملاء الشخصيين:</p>
      <HelpList
        items={[
          'الاسم الكامل للفرد',
          'رقم الهوية الوطنية أو الإقامة',
          'رقم الهاتف الشخصي',
          'البريد الإلكتروني الشخصي',
        ]}
      />
    </HelpSection>

    <HelpSection title="عميل مؤسسي (Corporate)" icon="check">
      <p className="mb-2">مناسب للشركات والمؤسسات:</p>
      <HelpList
        items={[
          'اسم الشركة الرسمي',
          'رقم السجل التجاري',
          'الرقم الضريبي',
          'اسم الشخص المسؤول',
          'بيانات التواصل الرسمية',
        ]}
      />
    </HelpSection>

    <HelpNote type="info">
      <strong>ملاحظة:</strong> اختيار النوع الصحيح مهم لأنه يؤثر على الفواتير والتقارير الضريبية.
    </HelpNote>
  </>
);
