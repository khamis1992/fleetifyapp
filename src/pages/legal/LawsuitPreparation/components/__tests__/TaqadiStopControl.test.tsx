import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaqadiStopControl } from '../TaqadiStopControl';
import type { TaqadiFilingJob } from '../../utils/taqadiAutomation';
afterEach(cleanup);
const job = (changes: Partial<TaqadiFilingJob> = {}) => ({ id:'job',status:'submitting',current_step:'final_approval',error_code:null,...changes }) as TaqadiFilingJob;
describe('visible agent stopping', () => {
  it('offers a direct stop while submitting', () => {
    const onStop=vi.fn(); render(<TaqadiStopControl job={job()} pending={false} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button',{name:'إيقاف الوكيل'})); expect(onStop).toHaveBeenCalledOnce();
  });
  it('waits for worker acknowledgement rather than claiming it already stopped', () => {
    render(<TaqadiStopControl job={job({error_code:'MANUAL_STOP_REQUESTED'})} pending={false} onStop={vi.fn()} />);
    expect(screen.getByRole('button',{name:'بانتظار توقف الوكيل'})).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('انتظر تأكيد التوقف');
  });
  it.each([{status:'filed'},{current_step:'receipt_sync_pending'},{error_code:'SUBMISSION_UNCERTAIN'},
    {error_code:'SUBMISSION_UNCERTAIN_AFTER_RESTART'},{error_code:'MANUALLY_STOPPED'}] as Partial<TaqadiFilingJob>[])
    ('does not offer cancellation of recorded or uncertain submissions: %j', changes => {
      render(<TaqadiStopControl job={job(changes)} pending={false} onStop={vi.fn()} />);
      expect(screen.queryByRole('button')).toBeNull();
    });
});
