import type { LegalDocumentData } from './legal-document-generator';
import { isTrafficViolationsOnlyScope } from '@/types/legalClaimScope';

/** Only these reviewed propositions may supply statutory citations to a memo.
 * Keep the verbatim supporting sentence and its official source together.
 * Unreviewed text (including saved claim-register prose) is never authority.
 */
export interface LegalCitation {
  article: string;
  law: string;
  proposition: string;
  supportingText: string;
  source: string;
}

const civil = 'القانون المدني رقم (22) لسنة 2004';
const civilSource = 'https://encyclop.sjc.gov.qa/lawlib/Images/court_civil/laws/22-2004/1.htm';
const enforcementLaw = 'قانون التنفيذ القضائي رقم (4) لسنة 2024';
const enforcementSource = 'https://www.almeezan.qa/LawView.aspx?LawID=9539&language=ar&opt=';
const citations = {
  jurisdiction: {
    article: '7', law: 'قانون إنشاء محكمة الاستثمار والتجارة رقم (21) لسنة 2021',
    proposition: 'اختصاص المحكمة بالمنازعات المتعلقة بالعقود التجارية',
    supportingText: 'فيما عدا الدعاوى والمنازعات التي تختص بالفصل فيها الدوائر الإدارية بالمحكمة الابتدائية واللجان ذات الاختصاص القضائي تختص الدائرة الابتدائية المشكلة من ثلاثة قضاة، دون غيرها، بالحكم ابتدائياً في الدعاوى والمنازعات التجارية التالية:\n1- المنازعات المتعلقة بالعقود التجارية، بما في ذلك عقود التمثيل التجاري والوكالات التجارية.',
    source: 'https://www.almeezan.qa/LawArticles.aspx?LawArticleID=82663&LawID=8760&language=ar',
  },
  contract: {
    article: '171', law: civil, proposition: 'القوة الملزمة للعقد',
    supportingText: 'العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين أو للأسباب التي يقررها القانون.',
    source: civilSource,
  },
  lease: {
    article: '582', law: civil, proposition: 'تعريف الإيجار',
    supportingText: 'الإيجار عقد يلتزم المؤجر بمقتضاه أن يمكن المستأجر من الانتفاع بشيء معين لمدة محدودة في مقابل عوض مالي.',
    source: civilSource,
  },
  rent: {
    article: '607', law: civil, proposition: 'الالتزام بالوفاء بالأجرة في موعدها',
    supportingText: 'يجب على المستأجر الوفاء بالأجرة في المواعيد المتفق عليها، فإذا لم يكن هناك اتفاق، وجب الوفاء بها في المواعيد التي يعينها العرف.',
    source: civilSource,
  },
  return: {
    article: '616', law: civil, proposition: 'رد العين المؤجرة والتعويض عن إبقائها دون حق',
    supportingText: 'يلتزم المستأجر برد العين المؤجرة وملحقاتها عند انتهاء الإيجار، فإذا أبقاها تحت يده دون حق، كان ملزماً إلى جانب الرد بأن يدفع للمؤجر تعويضاً يراعى في تقديره القيمة الايجارية وما أصاب المؤجر من ضرر.',
    source: 'https://www.almeezan.qa/LawArticles.aspx?LawArticleID=37060&LawID=2559&language=ar',
  },
  compensation: {
    article: '263', law: civil, proposition: 'تقدير التعويض عن الإخلال',
    supportingText: 'تقدر المحكمة التعويض إذا لم يكن مقدراً في العقد أو بمقتضى نص في القانون.',
    source: civilSource,
  },
  expert: {
    article: '333', law: 'قانون المرافعات المدنية والتجارية رقم (13) لسنة 1990',
    proposition: 'ندب خبير عند الاقتضاء',
    supportingText: 'للمحكمة عند الاقتضاء أن تحكم بندب خبير واحد أو ثلاثة خبراء.',
    source: 'https://www.almeezan.qa/PrintArticle_section.aspx?LawTreeSectionID=8123&language=ar&lawId=2492',
  },
  driverInformation: {
    article: '67', law: 'قانون المرور الصادر بالمرسوم بقانون رقم (19) لسنة 2007',
    proposition: 'إخبار المالك عن اسم وعنوان السائق وقت المخالفة',
    supportingText: 'على مالك المركبة أن يخبر العسكريين من قوة الشرطة عن اسم وعنوان الشخص الذي كان يسوق المركبة في وقت ارتكاب أي مخالفة.',
    source: 'https://www.almeezan.qa/LawArticles.aspx?LawArticleID=54175&LawID=3993&language=ar',
  },
  commercialEnforcement: {
    article: '7', law: enforcementLaw, proposition: 'النفاذ المعجل في المواد التجارية بشرط الكفالة',
    supportingText: 'والنفاذ المُعجل واجب بقوة القانون للأحكام الصادرة في المواد التجارية بشرط تقديم كفالة يُحددها القاضي، وذلك مع عدم الإخلال بأحكام القانون المنظم للتجارة',
    source: enforcementSource,
  },
  discretionaryEnforcement: {
    article: '9', law: enforcementLaw, proposition: 'جواز الأمر بالنفاذ المعجل بكفالة أو بغير كفالة عند تحقق إحدى حالاته',
    supportingText: 'يجوز الأمر في الحكم بالنفاذ المعجل بكفالة أو بغير كفالة، فـي الأحوال التالية:\n1- الأحكام الصادرة بأداء النفقات والأجور والمرتبات.\n2 - إذا صدر الحكم تنفيذاً لحكم سابق حائز لقوة الأمر المقضي أو مشمول بالنفاذ المعجل بغير كفالة أو كان مبنياً على سند رسمي لم يُطعن فيه بالتزوير، وذلك متى كان المحكوم عليه خصماً في الحكم السابق أو طرفاً في السند.\n3- إذا أقر المحكوم عليه بنشأة الالتزام.\n4- إذا بُني الحكم على سند عرفي لم يجحده المحكوم عليه.\n5- إذا صدر الحكم لمصلحة طالب التنفيذ في منازعة تتعلق به.\n6- إذا كان يترتب على تأخير التنفيذ ضرر جسيم بمصلحة المحكوم له',
    source: enforcementSource,
  },
} satisfies Record<string, LegalCitation>;

function citationReference(key: keyof typeof citations): string {
  const item = citations[key];
  return `المادة (${item.article}) من ${item.law}`;
}

export function buildVerifiedJurisdictionText(): string {
  return `تتمسك المدعية باختصاص محكمة الاستثمار والتجارة بنظر الدعوى وفق البند (1) من ${citationReference('jurisdiction')}، باعتبار النزاع ناشئاً عن عقد إيجار مركبة أبرمته في إطار نشاطها التجاري، وفق العقد والسجل التجاري المقدمين، مع مراعاة نطاق الاختصاص المقرر بالنص.`;
}

/** Contractual reimbursement and the owner's reporting duty are distinct.
 * Article 67 does not itself establish a debt to the lessor or automatic transfer.
 */
export function buildVerifiedTrafficLiabilityText(): string {
  return `تؤسس المدعية المطالبة المالية بقيمة المخالفات على الالتزام العقدي بتحملها في حدود ما يثبت من شروط العقد والكشف الرسمي وارتباط المخالفات بفترة الحيازة والاستعمال، إعمالاً للقوة الملزمة للعقد وفق ${citationReference('contract')}. وفي شأن الإخبار عن السائق، تقرر ${citationReference('driverInformation')} التزام مالك المركبة بالإخبار عن اسم وعنوان من كان يسوقها وقت المخالفة، وتقدم بياناته ومستندات الإسناد إلى الجهة المختصة. ويظل الفصل في المطالبة المالية قائماً على العقد والأدلة المقدمة.`;
}

export function buildVerifiedExpeditedEnforcementRequest(): string {
  return `شمول الحكم بالنفاذ المعجل وفق ${citationReference('commercialEnforcement')} بشأن الأحكام الصادرة في المواد التجارية، مع تقديم الكفالة التي يحددها القاضي. وتلتمس المدعية الأمر بالنفاذ المعجل بغير كفالة وفق ${citationReference('discretionaryEnforcement')} إذا قدرت المحكمة تحقق إحدى حالاته، ومنها أن يترتب على تأخير التنفيذ ضرر جسيم بمصلحة المحكوم لها، متى ثبت ذلك بالأدلة المقدمة.`;
}

/** The same selection drives both the internal audit and every memo export. */
export function getLegalCitationAudit(data: LegalDocumentData): LegalCitation[] {
  const result: LegalCitation[] = [citations.jurisdiction, citations.contract];
  if (!isTrafficViolationsOnlyScope(data.claimScope)) {
    result.push(citations.lease, citations.rent);
    if (data.vehicleCustody === 'with_defendant' || data.vehicleCustody === 'lost'
      || Number(data.retentionClaim?.amount) > 0
      || data.claimRegister?.rows.some(row => row.kind === 'retention' && row.status === 'ready')) {
      result.push(citations.return);
    }
    if (Number(data.damages) > 0 || Number(data.contractualCompensation?.amount) > 0
      || data.claimRegister?.rows.some(row => !['rent_due', 'legal_extension_rent', 'violations'].includes(row.kind) && row.status === 'ready')) {
      result.push(citations.compensation);
    }
  }
  if (data.customer.violations_count > 0) result.push(citations.driverInformation);
  result.push(citations.expert);
  result.push(citations.commercialEnforcement, citations.discretionaryEnforcement);
  return result.filter(item => item.supportingText.trim() && item.source);
}

/** Numbers in manually entered legal references are unverified even if a
 * number happens to be on the allowlist: its attributed meaning may differ.
 * Dates, money, violation numbers and contractual clause numbers stay intact.
 */
export function omitUnverifiedArticleReferences(value: string): string {
  const number = '[0-9٠-٩۰-۹]+';
  const item = `\\(?\\s*${number}(?:\\s*\\))?`;
  return value.replace(new RegExp(
    `(?:المادة|المادتان|المادتين|المواد)\\s*(?:رقم\\s*)?${item}(?:\\s*(?:و|،|,|إلى|الى|حتى|[-–])\\s*و?\\s*${item})*`, 'g',
  ), '[يُستكمل]');
}

export function renderVerifiedLegalBasis(data: LegalDocumentData): string {
  return getLegalCitationAudit(data).map(item =>
    `<div class="legal-article"><strong>${item.proposition} — المادة (${item.article}) من ${item.law}:</strong> «${item.supportingText}»</div>`,
  ).join('');
}

export const LEGAL_CITATION_REVIEW_NOTES = [
  'خصم الوفاء: تراجع السندات وتعيين الدين. إذا وصف السند الوفاء بأنه «أجرة» فلا يعاد تخصيصه للمخالفات. لا تُعرض النصوص المقررة لحق المدين في تعيين الدين المسدد كسند لصالح المؤجر.',
  'المطالبة المالية بقيمة المخالفات تسند إلى الالتزام العقدي المثبت والقوة الملزمة للعقد؛ المادة 67 مرور تخص إخبار المالك عن السائق. أحكام السرعة لا تصلح سنداً عاماً لتحميل المستأجر قيمة المخالفات.',
  'النفاذ المعجل التجاري وفق المادة 7 من قانون التنفيذ القضائي مشروط بكفالة يحددها القاضي؛ طلبه بغير كفالة وفق المادة 9 مشروط بتحقق إحدى حالاتها، ولا يفترض ثبوت الضرر الجسيم أو إقرار المدين أو عدم جحده السند.',
  'تُنقل تواريخ الوقائع والمبالغ وأرقام المخالفات من المستندات مع مراجعة السنة، ولا تُستنتج بيانات ناقصة. مبالغ الإجماليات حسابية من السجل المعتمد.',
  'يُطابق اسم المؤجر حرفياً بين العقد والسجل التجاري قبل الإيداع، ويُنبّه إلى أي اختلاف؛ الاسم المعتمد المقدم: شركة العراف لتأجير السيارات ذ.م.م، سجل تجاري 146832.',
] as const;
