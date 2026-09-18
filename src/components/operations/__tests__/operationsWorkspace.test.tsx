import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Users } from 'lucide-react';
import { OperationsMetric, OperationsWorkspace } from '../OperationsWorkspace';
import { operationsCsv, pageNumbers } from '../operationsPresentation';

afterEach(cleanup);
describe('operations presentation', () => {
  it('keeps the current page reachable beyond the first five pages', () => {
    expect(pageNumbers(1, 0)).toEqual([]);
    expect(pageNumbers(1, 2)).toEqual([1,2]);
    expect(pageNumbers(8, 20)).toEqual([6,7,8,9,10]);
    expect(pageNumbers(20, 20)).toEqual([16,17,18,19,20]);
  });
  it('exports Arabic, zero amounts and multiline cells without executable spreadsheet formulas', () => {
    const csv = operationsCsv([['رقم الطلب','التكلفة'],['=1+1',0],['  @SUM(1,2)',-10],['سطر\n"ثانٍ"',null]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=1+1","0"');
    expect(csv).toContain('"\'  @SUM(1,2)","-10"');
    expect(csv).toContain('"سطر\n""ثانٍ""",""');
  });
  it('renders Arabic navigation and limits portal styling to the mounted page', () => {
    const view=render(<MemoryRouter><OperationsWorkspace section="crm"><p>محتوى المتابعة</p></OperationsWorkspace></MemoryRouter>);
    expect(screen.getByRole('heading',{name:'علاقات العملاء',level:1}).closest('[dir]')).toHaveAttribute('dir','rtl');
    expect(screen.getByRole('link',{name:'علاقات العملاء'})).toHaveAttribute('aria-current','page');
    expect(document.body.dataset.operationsActive).toBe('customers');
    view.unmount();
    expect(document.body.dataset.operationsActive).toBeUndefined();
  });
  it('uses buttons only for actionable metrics and preserves unknown values', () => {
    const onClick=vi.fn();
    render(<><OperationsMetric label="معلّقة" value="—" hint="جارٍ القراءة" icon={Users}/><OperationsMetric label="نتائج" value={0} hint="عرض النتائج" icon={Users} onClick={onClick}/></>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText('—')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:/نتائج/}));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
