import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildOpeningEntryDraft,
  parseOpeningBalancesWorkbook,
} from '../parseOpeningBalancesWorkbook';

function buildFixtureWorkbook(): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const company: (string | number | null)[][] = [
    ['بيانات الشركة وتاريخ القطع', null, null],
    ['البيان', 'أدخلوا هنا', 'ملاحظة'],
    ['اسم الشركة كما في السجل', 'شركة العراف', null],
    ['تاريخ القطع للمركز المالي', '2026-08-31', null],
    ['النقد في الصندوق اليوم', 5000, null],
    ['مجموع أرصدة البنوك اليوم', 120000, null],
    ['ذمم عملاء تقديرية (إيجارات لاحقة)', 30000, null],
    ['رأس المال المسجل إن عُرف', 10000, null],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(company), 'بيانات الشركة');

  const vehicles: (string | number | null)[][] = [
    ['حصر السيارات', null, null, null, null, null, null, null, null],
    ['م', 'اللوحة', 'النوع / الموديل / السنة', 'باسم أي شركة؟', 'مرهونة؟', 'لصالح من الرهن', 'تكلفة الشراء إن عُرفت', 'القيمة السوقية اليوم تقدير', 'ملاحظات'],
    [1, '12345', 'تويوتا كامري 2023', 'العراف', 'لا', null, 90000, 75000, null],
    [2, '67890', 'نيسان سنتر 2022', 'العراف', 'نعم', 'الريادة', null, 60000, 'بلا فاتورة'],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vehicles), 'الأصول — السيارات');

  const liabilities: (string | number | null)[][] = [
    ['الديون والالتزامات', null, null, null, null, null, null, null, null],
    ['م', 'الدائن', 'طبيعة الدين', 'مطالب به في الدعوى؟', 'أصل الدين ر.ق', 'ما سُدد ر.ق', 'المتبقي ر.ق', 'مرهون عليه أصل؟', 'ملاحظات'],
    [1, 'الريادة للسيارات', 'تسوية 27/2/2025', 'نعم', 6856479, 438023, 6418456, 'نعم', 'يُراجع'],
    [2, 'ورشة الصيانة', 'فواتير صيانة', 'لا', 5000, 2000, 3000, 'لا', null],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(liabilities), 'الخصوم والديون');

  const receipts: (string | number | null)[][] = [
    ['سجل إيصالات الإيجار الشهري', null, null, null, null, null, null, null, null, null],
    ['م', 'تاريخ الإيصال', 'رقم الإيصال', 'اسم المستأجر / الجهة', 'رقم السيارة / اللوحة', 'الشهر المغطى', 'المبلغ المحصّل ر.ق', 'طريقة القبض', 'رقم الحساب/الشيك', 'ملاحظات'],
    [1, '2025-03-01', '001', 'مثال — احذفوه', '12345', 'مارس 2025', 3500, 'تحويل', null, null],
    [2, '2025-03-05', '002', 'أحمد علي', '67890', 'مارس 2025', 2500, 'نقدي', null, null],
    [3, '2025-04-01', '003', 'شركة قطر للتواصل', '11122', 'أبريل 2025', '4,000', 'شيك', 'CHQ-9', null],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(receipts), 'سجل الإيصالات');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return out;
}

const parsed = parseOpeningBalancesWorkbook(buildFixtureWorkbook());

describe('parseOpeningBalancesWorkbook', () => {

  it('reads company scalars and the cutoff date', () => {
    expect(parsed.company.cutoffDate).toBe('2026-08-31');
    expect(parsed.company.cashOnHand).toBe(5000);
    expect(parsed.company.bankBalances).toBe(120000);
    expect(parsed.company.estimatedReceivables).toBe(30000);
    expect(parsed.company.registeredCapital).toBe(10000);
  });

  it('collects vehicles, totals cost, and flags missing costs', () => {
    expect(parsed.vehicles).toHaveLength(2);
    expect(parsed.vehicleCostTotal).toBe(90000);
    expect(parsed.vehicleMarketTotal).toBe(135000);
    expect(parsed.vehiclesMissingCost).toBe(1);
  });

  it('computes each liability remaining and its total', () => {
    expect(parsed.liabilities.map(row => row.remaining)).toEqual([6418456, 3000]);
    expect(parsed.liabilityTotal).toBe(6421456);
  });

  it('skips the example receipt and parses real ones with cleaned amounts', () => {
    expect(parsed.receipts).toHaveLength(2);
    expect(parsed.receipts[0].tenant).toBe('أحمد علي');
    expect(parsed.receipts[1].amount).toBe(4000);
    expect(parsed.receiptTotal).toBe(6500);
  });
});

describe('buildOpeningEntryDraft', () => {
  it('builds a balanced draft with an auto opening-equity line', () => {
    const draft = buildOpeningEntryDraft(parsed);
    const byKey = Object.fromEntries(draft.lines.map(line => [line.key, line]));
    expect(byKey.cash.amount).toBe(5000);
    expect(byKey.banks.amount).toBe(120000);
    // Vehicles value at purchase cost (90000) because cost total > 0.
    expect(byKey.vehicles.amount).toBe(90000);
    expect(byKey['liability-1'].amount).toBe(6418456);
    expect(byKey['liability-1'].side).toBe('credit');
    expect(byKey.capital.amount).toBe(10000);
    // 245000 debits − 6431456 credits = −6186456 → opening equity is a DEBIT balancing line.
    expect(byKey['opening-equity'].side).toBe('debit');
    expect(byKey['opening-equity'].amount).toBe(6186456);
    expect(draft.balance).toBe(0);
    expect(draft.debits).toBe(draft.credits);
  });

  it('uses market valuation only when no purchase cost exists', () => {
    const noCost = {
      ...parsed,
      vehicleCostTotal: 0,
      vehicleMarketTotal: 135000,
    };
    const draft = buildOpeningEntryDraft(noCost);
    const vehiclesLine = draft.lines.find(line => line.key === 'vehicles');
    expect(vehiclesLine?.amount).toBe(135000);
    expect(vehiclesLine?.detail).toContain('القيمة السوقية');
  });

  it('throws on unreadable input instead of returning partial data', () => {
    expect(() => parseOpeningBalancesWorkbook(new ArrayBuffer(0))).toThrow();
  });
});

describe('workbook warnings', () => {
  it('warns when a present sheet loses its header row', () => {
    const wb = XLSX.utils.book_new();
    const company: (string | number | null)[][] = [
      ['البيان', 'أدخلوا هنا'],
      ['النقد في الصندوق اليوم', 1000],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(company), 'بيانات الشركة');
    // Receipts sheet exists but its header row is missing.
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['عنوان فقط', null], [1, 2500]]),
      'سجل الإيصالات'
    );
    const parsed = parseOpeningBalancesWorkbook(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer);
    expect(parsed.company.cashOnHand).toBe(1000);
    expect(parsed.warnings.some(warning => warning.includes('سجل الإيصالات'))).toBe(true);
    expect(parsed.receipts).toHaveLength(0);
  });
});
