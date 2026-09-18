import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignedContractReview } from '@/components/contracts/SignedContractReview';
import { loadSignedContractPages, applySignedContractRotations } from '@/utils/signedContractReview';

vi.mock('@/utils/signedContractReview', async (original) => ({
  ...await original<typeof import('@/utils/signedContractReview')>(),
  loadSignedContractPages: vi.fn(), applySignedContractRotations: vi.fn(),
}));
const file = new File(['pdf'], 'signed.pdf', { type: 'application/pdf' });
const page = { image: 'data:image/png;base64,AA==', width: 100, height: 200, contractNumber: '123' };
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) { this.open = true; });
  vi.mocked(loadSignedContractPages).mockResolvedValue([page, page]);
  vi.mocked(applySignedContractRotations).mockResolvedValue(file);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('signed contract review gate', () => {
  it('requires all pages to load and confirmation; rotating resets confirmation', async () => {
    const done = vi.fn();
    render(<SignedContractReview file={file} expected={{ contractNumber: '123' }} onDone={done} />);
    fireEvent.load(await screen.findByRole('img'));
    expect(screen.getByRole('checkbox')).toBeDisabled();
    fireEvent.click(screen.getByText('التالي'));
    fireEvent.load(screen.getByRole('img'));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByText('متابعة الرفع والفحص')).toBeEnabled();
    fireEvent.click(screen.getByText('تدوير الكل 90°'));
    expect(screen.getByText('متابعة الرفع والفحص')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByText('متابعة الرفع والفحص'));
    await waitFor(() => expect(done).toHaveBeenCalledWith(file));
    expect(applySignedContractRotations).toHaveBeenCalledWith(file, [90, 90]);
  });
  it('blocks a mixed-contract PDF before upload', async () => {
    vi.mocked(loadSignedContractPages).mockResolvedValue([page, { ...page, contractNumber: '456' }]);
    const done = vi.fn();
    render(<SignedContractReview file={file} expected={{ contractNumber: '123' }} onDone={done} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تخص عقدًا آخر');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText('متابعة الرفع والفحص')).toBeDisabled();
    expect(done).not.toHaveBeenCalled();
  });
  it('keeps a corrupt file blocked and allows cancellation', async () => {
    vi.mocked(loadSignedContractPages).mockRejectedValue(new Error('ملف تالف'));
    const done = vi.fn();
    render(<SignedContractReview file={file} expected={{ contractNumber: '123' }} onDone={done} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('ملف تالف');
    expect(screen.getByText('متابعة الرفع والفحص')).toBeDisabled();
    fireEvent.click(screen.getByText('إلغاء الرفع'));
    expect(done).toHaveBeenCalledWith(null);
  });
});
