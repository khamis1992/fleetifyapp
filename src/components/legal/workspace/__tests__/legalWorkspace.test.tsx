import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { LegalCase } from '@/hooks/useLegalCases';
import { LegalWorkspace } from '../LegalWorkspace';
import { isLegalDestinationActive } from '../legalNavigation';
import { legalDashboardModel } from '../legalDashboardModel';
import { LegalCalendar, type LegalHearing } from '../LegalCalendar';
import { legalCaseCsv } from '../legalCaseExport';
import { legalCaseStatusLabel, legalCaseTypeLabel } from '../legalLabels';
import { LegalPageState } from '../LegalPageState';

afterEach(cleanup);

describe('legal navigation', () => {
  it('distinguishes query views, preserves filtered register selection, and supports its alias', () => {
    expect(isLegalDestinationActive('/legal/cases?view=dashboard', '/legal/cases', '')).toBe(true);
    expect(isLegalDestinationActive('/legal/cases?view=cases', '/legal/cases', '?view=cases&contract_id=one')).toBe(true);
    expect(isLegalDestinationActive('/legal/cases?view=dashboard', '/legal/cases', '?view=cases')).toBe(false);
    expect(isLegalDestinationActive('/legal/cases?view=cases', '/legal/cases-v2', '?view=cases')).toBe(true);
    expect(isLegalDestinationActive('/legal/documents', '/legal/document-generator', '')).toBe(false);
  });

  it('renders Arabic RTL navigation and removes portal styling when leaving the section', () => {
    const view = render(<MemoryRouter initialEntries={['/legal/cases?view=cases']}><LegalWorkspace><p>ملف الاختبار</p></LegalWorkspace></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'أقسام الشؤون القانونية' }).closest('[dir]')).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('link', { name: 'سجل القضايا', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(document.body.hasAttribute('data-legal-active')).toBe(true);
    view.unmount();
    expect(document.body.hasAttribute('data-legal-active')).toBe(false);
  });
});

const caseRow = (id: string, data: Partial<LegalCase> = {}) => ({ id, case_number: id, case_status: 'active', case_type: 'civil', priority: 'medium', created_at: '2026-08-01T10:00:00Z', ...data } as LegalCase);
describe('legal dashboard presentation data', () => {
  it('excludes terminal cases from attention and upcoming hearings, and ignores invalid dates', () => {
    const rows = [caseRow('today', { hearing_date: '2026-09-07' }), caseRow('future', { hearing_date: '2027-01-01' }), caseRow('past', { hearing_date: '2026-08-01' }), caseRow('invalid', { hearing_date: 'invalid' }), caseRow('closed', { case_status: 'closed', hearing_date: '2026-10-01' }), caseRow('cancelled', { case_status: 'cancelled', hearing_date: '2026-10-01' })];
    const model = legalDashboardModel(rows, new Date(2026, 8, 7, 16));
    expect(model.hearings.map(item => item.id)).toEqual(['today', 'future']);
    expect(model.attention.map(item => item.id)).not.toContain('closed');
    expect(model.attention.map(item => item.id)).not.toContain('cancelled');
    expect(model.types).toEqual([['civil', 6]]);
  });
  it('ranks urgent files before high-priority files and then sorts by update', () => {
    const rows = [caseRow('high-old', { priority: 'high' }), caseRow('normal'), caseRow('urgent', { priority: 'urgent' }), caseRow('high-new', { priority: 'high', updated_at: '2026-09-01T10:00:00Z' })];
    expect(legalDashboardModel(rows).attention.map(item => item.id)).toEqual(['urgent', 'high-new', 'high-old', 'normal']);
  });
  it('keeps a recorded judgment and enforcement stage distinct from closure', () => {
    expect(legalCaseStatusLabel('حكم صادر')).toBe('حكم صادر');
    expect(legalCaseStatusLabel('enforcement')).toBe('قيد التنفيذ');
    expect(legalCaseStatusLabel('cancelled')).toBe('ملغاة');
    expect(legalCaseTypeLabel('collection')).toBe('تحصيل مستحقات');
  });
  it('groups legacy and current collection types into a single category', () => {
    const model = legalDashboardModel([caseRow('legacy', { case_type: 'collection' }), caseRow('current', { case_type: 'payment_collection' })]);
    expect(model.types).toEqual([['payment_collection', 2]]);
  });
});

describe('legal loading and error states', () => {
  it('keeps the failure visible and retries without presenting an empty success state', () => {
    const retry = vi.fn();
    const view = render(<LegalPageState title="البلاغات القانونية" loading message="البيانات غير متاحة" onRetry={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل البيانات');
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull();
    view.rerender(<LegalPageState title="البلاغات القانونية" loading={false} message="البيانات غير متاحة" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('البيانات غير متاحة');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('legal calendar actions', () => {
  const hearings: LegalHearing[] = [
    { id: 'one', caseId: 'C-1', date: '2026-09-07', displayDate: '٧ سبتمبر ٢٠٢٦', time: 'لم يحدد الوقت', title: 'دعوى اختبار', location: 'المحكمة', daysUntil: 0 },
    { id: 'two', caseId: 'C-2', date: '2026-09-05', displayDate: '٥ سبتمبر ٢٠٢٦', time: 'لم يحدد الوقت', title: 'دعوى سابقة', location: 'المحكمة', daysUntil: -2 },
  ];
  it('switches to recent sessions and opens the actual case id', () => {
    const onOpen = vi.fn();
    render(<MemoryRouter><LegalCalendar hearings={hearings} onOpen={onOpen} loading={false} error={false} onRetry={vi.fn()} loadedCount={2} totalCount={2} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'فتح القضية C-1' }));
    expect(onOpen).toHaveBeenLastCalledWith('one');
    fireEvent.click(screen.getByRole('button', { name: /الأسبوع الماضي/ }));
    expect(screen.queryByRole('button', { name: 'فتح القضية C-1' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'فتح القضية C-2' }));
    expect(onOpen).toHaveBeenLastCalledWith('two');
  });
});

describe('Arabic legal CSV', () => {
  it('preserves Arabic, commas, quotes and newlines, and blocks cell formulas', () => {
    const csv = legalCaseCsv([['العميل', 'القيمة'], ['اسم، "عميل"\nسطر', 1700], ['=HYPERLINK("x")', -25], ['  +SUM(1,2)', null]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"اسم، ""عميل""\nسطر","1700"');
    expect(csv).toContain('"\'=HYPERLINK(""x"")","-25"');
    expect(csv).toContain('"\'  +SUM(1,2)",""');
  });
});
