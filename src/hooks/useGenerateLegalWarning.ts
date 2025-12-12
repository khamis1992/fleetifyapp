import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { DelinquentCustomer } from "./useDelinquentCustomers";

/* =========================
   Currency configuration
========================= */
const CURRENCY_NAMES: Record<string, string> = {
  KWD: "دينار كويتي",
  QAR: "ريال قطري",
  SAR: "ريال سعودي",
  AED: "درهم إماراتي",
  OMR: "ريال عماني",
  BHD: "دينار بحريني",
  USD: "دولار أمريكي",
  EUR: "يورو",
};

/* =========================
   Types
========================= */
export interface GenerateWarningParams {
  delinquentCustomer: DelinquentCustomer;
  warningType?: "initial" | "formal" | "final";
  deadlineDays?: number;
  includeBlacklistThreat?: boolean;
  additionalNotes?: string;
}

export interface GeneratedWarning {
  id: string;
  document_number: string;
  content: string;
  customer_id: string;
  customer_name: string;
  warning_type: string;
  created_at: string;
}

interface CompanyInfo {
  name_ar: string;
  phone: string;
  email: string;
  address: string;
  commercial_register: string;
  currency: string;
}

interface WarningData {
  documentNumber: string;
  date: string;
  deadlineDate: string;
  customer: DelinquentCustomer;
  company: CompanyInfo;
  currency: string;
  currencyName: string;
  deadlineDays: number;
  includeBlacklistThreat: boolean;
  additionalNotes?: string;
}

/* =========================
   WhatsApp-friendly templates
   (Qatari legal tone)
========================= */

/**
 * تنبيه ودي (واتساب)
 */
function generateInitialWarningTemplate(data: WarningData): string {
  const { documentNumber, date, deadlineDate, customer, company, currency, currencyName, deadlineDays } = data;

  return `
${company.name_ar}
سجل تجاري: ${company.commercial_register}

تنبيه ودي – سداد مستحقات
رقم: ${documentNumber}
التاريخ: ${date}

السيد/السيدة: ${customer.customer_name}
رقم العميل: ${customer.customer_code}
${customer.phone ? `هاتف: ${customer.phone}` : ""}

نود إفادتكم بوجود مستحقات مالية متأخرة على عقد الإيجار رقم (${customer.contract_number})
الخاصة بالمركبة (${customer.vehicle_plate || "—"}).

تفاصيل المبالغ:
- إيجارات متأخرة: ${customer.overdue_amount.toLocaleString()} ${currency}
- غرامات تأخير: ${customer.late_penalty.toLocaleString()} ${currency}
- مخالفات مرورية: ${customer.violations_amount.toLocaleString()} ${currency}

الإجمالي المستحق: ${customer.total_debt.toLocaleString()} ${currencyName}

يرجى السداد خلال (${deadlineDays}) أيام، بحد أقصى:
${deadlineDate}

هذا التنبيه ودي، ونأمل التسوية دون أي إجراءات قانونية.

للتواصل:
${company.phone}
${company.email}

${company.name_ar}
إدارة التحصيل
`.trim();
}

/**
 * إنذار رسمي (واتساب)
 */
function generateFormalWarningTemplate(data: WarningData): string {
  const {
    documentNumber,
    date,
    deadlineDate,
    customer,
    company,
    currency,
    currencyName,
    deadlineDays,
    includeBlacklistThreat,
  } = data;

  return `
${company.name_ar}
سجل تجاري: ${company.commercial_register}

إنذار رسمي بسداد مستحقات
رقم الإنذار: ${documentNumber}
التاريخ: ${date}

إلى: ${customer.customer_name}
رقم العميل: ${customer.customer_code}
${customer.phone ? `هاتف: ${customer.phone}` : ""}

بالإشارة إلى عقد الإيجار رقم (${customer.contract_number})
والمركبة (${customer.vehicle_plate || "—"})،

نحيطكم علمًا بوجود ذمم مالية مستحقة وفق الآتي:

- إيجارات متأخرة: ${customer.overdue_amount.toLocaleString()} ${currency}
- غرامات تأخير: ${customer.late_penalty.toLocaleString()} ${currency}
- مخالفات مرورية: ${customer.violations_amount.toLocaleString()} ${currency}

الإجمالي المستحق: ${customer.total_debt.toLocaleString()} ${currencyName}
مدة التأخير: ${customer.days_overdue} يوم

نمهلكم (${deadlineDays}) أيام للسداد، بحد أقصى:
${deadlineDate}

في حال عدم السداد خلال المهلة، سيترتب علينا اتخاذ الإجراءات القانونية المنصوص عليها وفق القوانين المعمول بها في دولة قطر، بما في ذلك المطالبة القضائية بكامل المبالغ والمصاريف.
${includeBlacklistThreat ? "كما قد يتم إيقاف التعامل وإدراج الاسم ضمن أنظمة المخاطر لدى شركات التأجير." : ""}

هذا الإنذار يُعد إخطارًا رسميًا صالحًا للاحتجاج به.

للتواصل العاجل:
${company.phone}
${company.email}

${company.name_ar}
الإدارة القانونية
`.trim();
}

/**
 * إنذار نهائي (واتساب – ما قبل الدعوى)
 */
function generateFinalWarningTemplate(data: WarningData): string {
  const { documentNumber, date, deadlineDate, customer, company, currency, currencyName, deadlineDays } = data;

  return `
${company.name_ar}
سجل تجاري: ${company.commercial_register}

⚠️ إنذار نهائي قبل اتخاذ الإجراءات القانونية ⚠️
رقم: ${documentNumber}
التاريخ: ${date}

إلى: ${customer.customer_name}
رقم العميل: ${customer.customer_code}

نحيطكم علمًا بأن هذا هو الإنذار الأخير بخصوص المستحقات المتراكمة على عقد الإيجار رقم (${customer.contract_number})
والمركبة (${customer.vehicle_plate || "—"}).

المبالغ المستحقة:
- إيجارات متأخرة: ${customer.overdue_amount.toLocaleString()} ${currency}
- غرامات تأخير: ${customer.late_penalty.toLocaleString()} ${currency}
- مخالفات مرورية: ${customer.violations_amount.toLocaleString()} ${currency}

الإجمالي النهائي: ${customer.total_debt.toLocaleString()} ${currencyName}
مدة التأخير: ${customer.days_overdue} يوم

المهلة النهائية للسداد:
${deadlineDate}
(${deadlineDays}) أيام فقط

في حال عدم السداد خلال المهلة أعلاه، سيتم مباشرة رفع الدعوى القضائية دون إشعار آخر، والمطالبة بكامل المبالغ والمصاريف والتعويضات وفق القوانين السارية في دولة قطر.

هذا الإخطار حجة قانونية مكتملة الأثر.

للتواصل الفوري:
${company.phone}
${company.email}

${company.name_ar}
الإدارة القانونية
`.trim();
}

/* =========================
   Template selector
========================= */
function generateWarningFromTemplate(
  warningLevel: "initial" | "formal" | "final",
  data: WarningData
): string {
  switch (warningLevel) {
    case "initial":
      return generateInitialWarningTemplate(data);
    case "final":
      return generateFinalWarningTemplate(data);
    case "formal":
    default:
      return generateFormalWarningTemplate(data);
  }
}

/* =========================
   Main hook
========================= */
export const useGenerateLegalWarning = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateWarningParams): Promise<GeneratedWarning> => {
      if (!user?.id) throw new Error("User not authenticated");

      const {
        delinquentCustomer,
        warningType = "formal",
        deadlineDays = 7,
        includeBlacklistThreat = true,
        additionalNotes,
      } = params;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const { data: company } = await supabase
        .from("companies")
        .select("name_ar, phone, email, address, commercial_register, currency")
        .eq("id", profile.company_id)
        .single();

      const companyCurrency = (company?.currency || "QAR").toUpperCase();
      const currencyName = CURRENCY_NAMES[companyCurrency] || "ريال قطري";

      const documentNumber = `WRN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const today = new Date();
      const deadline = new Date(today);
      deadline.setDate(deadline.getDate() + deadlineDays);

      const formatter = new Intl.DateTimeFormat("ar-QA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      let warningLevel: "initial" | "formal" | "final" = warningType;
      if (delinquentCustomer.days_overdue > 120 || delinquentCustomer.risk_score >= 85) {
        warningLevel = "final";
      } else if (delinquentCustomer.days_overdue > 60 || delinquentCustomer.risk_score >= 70) {
        warningLevel = "formal";
      }

      const content = generateWarningFromTemplate(warningLevel, {
        documentNumber,
        date: formatter.format(today),
        deadlineDate: formatter.format(deadline),
        customer: delinquentCustomer,
        company: {
          name_ar: company?.name_ar || "",
          phone: company?.phone || "",
          email: company?.email || "",
          address: company?.address || "",
          commercial_register: company?.commercial_register || "",
          currency: companyCurrency,
        },
        currency: companyCurrency,
        currencyName,
        deadlineDays,
        includeBlacklistThreat,
        additionalNotes,
      });

      const { data: document } = await supabase
        .from("legal_documents")
        .insert({
          company_id: profile.company_id,
          customer_id: delinquentCustomer.customer_id,
          document_number: documentNumber,
          document_type: "legal_warning",
          document_title: `${warningLevel} warning - ${delinquentCustomer.customer_name}`,
          content,
          country_law: "qatar",
          status: "draft",
          created_by: user.id,
        })
        .select()
        .single();

      return {
        id: document.id,
        document_number: documentNumber,
        content,
        customer_id: delinquentCustomer.customer_id,
        customer_name: delinquentCustomer.customer_name,
        warning_type: warningLevel,
        created_at: document.created_at,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["legal-documents"] });
      toast.success("تم إنشاء الإنذار بنجاح", {
        description: data.document_number,
      });
    },
    onError: (error: any) => {
      toast.error("فشل إنشاء الإنذار", {
        description: error.message,
      });
    },
  });
};
