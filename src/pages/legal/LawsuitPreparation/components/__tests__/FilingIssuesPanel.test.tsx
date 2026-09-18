import { fireEvent, render, screen, cleanup, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilingIssuesPanel } from '../FilingIssuesPanel';
import type { FilingIssue } from '../../utils/filingIssues';

afterEach(cleanup);
describe('filing issues panel', () => {
  it('shows every issue with its own resolution, separating warnings from blockers', () => {
    const issues: FilingIssue[] = [
      { id: 'nationality', severity: 'blocking', title: 'الجنسية غير مسجلة', description: 'وفق الهوية', actionLabel: 'استكمال الجنسية', resolution: { kind: 'nationality' } },
      { id: 'custody', severity: 'warning', title: 'محضر الاسترداد', description: 'اربط المحضر', actionLabel: 'استكمال المحاضر', resolution: { kind: 'tab', tab: 'evidence', anchor: 'lawsuit-custody' } },
    ];
    const onResolve = vi.fn();
    render(<FilingIssuesPanel issues={issues} onResolve={onResolve} />);
    expect(screen.getByText('نواقص تمنع الرفع: 1')).toBeVisible();
    expect(screen.getByText('ملاحظات للتوثيق: 1')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'استكمال الجنسية: الجنسية غير مسجلة' }));
    expect(onResolve).toHaveBeenLastCalledWith(issues[0]);
    fireEvent.click(screen.getByRole('button', { name: 'استكمال المحاضر: محضر الاسترداد' }));
    expect(onResolve).toHaveBeenLastCalledWith(issues[1]);
    expect(within(screen.getByRole('region', { name: 'ملاحظات الدعوى واستكمال النواقص' })).getAllByRole('article')).toHaveLength(2);
  });
});
