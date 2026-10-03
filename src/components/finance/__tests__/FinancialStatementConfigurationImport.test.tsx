import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fixtureCompanyId, fixturePreparerId, makeFinancialStatementPackageFixture } from '../../../../tests/visual/financial-statement-package/fixtureData';
import { financialStatementImportMaxBytes } from '@/utils/financialStatementConfigurationImport';
import { FinancialStatementConfigurationImport } from '../FinancialStatementConfigurationImport';

vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-10-01' }));
function settingsFile(text: string) {
  const file = new File([text], 'configuration.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(text) });
  return file;
}
const choose = (file: File) => fireEvent.change(screen.getByLabelText('Import package settings from a file'), { target: { files: [file] } });

describe('financial statement configuration import control', () => {
  it('previews the period and pending disclosures and applies only after a deliberate click', async () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    report.configuration.notes.forEach(note => { note.status = 'pending'; });
    render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={onApply} />);
    choose(settingsFile(JSON.stringify({ companyId: fixtureCompanyId, configuration: report.configuration })));
    await screen.findByRole('button', { name: 'Apply settings to the draft' });
    expect(screen.getByText('Disclosures: 14 · Pending: 14')).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings to the draft' }));
    expect(onApply).toHaveBeenCalledWith(report.configuration);
    expect(screen.queryByRole('button', { name: 'Apply settings to the draft' })).not.toBeInTheDocument();
  });
  it('rechecks source account scope when applying a preview after source data changes', async () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    const view = render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={onApply} />);
    choose(settingsFile(JSON.stringify({ companyId: fixtureCompanyId, configuration: report.configuration })));
    await screen.findByRole('button', { name: 'Apply settings to the draft' });
    view.rerender(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={{ ...report, position: { ...report.position, accounts: [] } }} locale="en" onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings to the draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent('account absent');
    expect(onApply).not.toHaveBeenCalled();
  });
  it('refuses foreign company files and oversized files without reading their contents', async () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={onApply} />);
    choose(settingsFile(JSON.stringify({ companyId: fixturePreparerId, configuration: report.configuration })));
    expect(await screen.findByRole('alert')).toHaveTextContent('another company');
    const large = settingsFile(' '.repeat(financialStatementImportMaxBytes + 1));
    choose(large);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('exceeds 1 MiB'));
    expect(large.text).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });
  it('keeps saved versions and unavailable company reports read-only', () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    const view = render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" disabled onApply={onApply} />);
    expect(screen.getByLabelText('Import package settings from a file')).toBeDisabled();
    view.rerender(<FinancialStatementConfigurationImport companyId={fixturePreparerId} report={report} locale="en" onApply={onApply} />);
    expect(screen.getByLabelText('Import package settings from a file')).toBeDisabled();
  });
  it('imports a retained source override after server trimming and rechecks that provenance at apply time', async () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    report.configuration.journalOverrides = [{ journalId: fixturePreparerId, treatment: 'regular', internalCashTransfer: 0, equityCategory: 'other', cashFlows: [], reason: 'This reviewed journal is retained in the scoped source configuration.' }];
    expect(report.journals).toHaveLength(0);
    const view = render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={onApply} />);
    choose(settingsFile(JSON.stringify({ companyId: fixtureCompanyId, configuration: report.configuration })));
    await screen.findByRole('button', { name: 'Apply settings to the draft' });
    expect(screen.getByText('Account mappings: 8 · Journal treatments: 1')).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    const sourceWithoutOverride = { ...report, configuration: { ...report.configuration, journalOverrides: [] } };
    view.rerender(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={sourceWithoutOverride} locale="en" onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply settings to the draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent('journal absent');
    expect(onApply).not.toHaveBeenCalled();
  });
  it('applies a retained reviewed override without saving, approving or replacing its pending disclosure', async () => {
    const report = makeFinancialStatementPackageFixture(), onApply = vi.fn();
    report.configuration.journalOverrides = [{ journalId: fixturePreparerId, treatment: 'regular', internalCashTransfer: 0, equityCategory: 'other', cashFlows: [], reason: 'This reviewed journal is retained in the scoped source configuration.' }];
    report.configuration.notes[0].status = 'pending';
    render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={onApply} />);
    choose(settingsFile(JSON.stringify({ companyId: fixtureCompanyId, configuration: report.configuration })));
    fireEvent.click(await screen.findByRole('button', { name: 'Apply settings to the draft' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(report.configuration);
    expect(onApply.mock.calls[0][0].notes[0].status).toBe('pending');
  });
  it('disables importing when the position source belongs to another company', () => {
    const report = makeFinancialStatementPackageFixture();
    report.position = { ...report.position, company: { ...report.position.company, id: fixturePreparerId } };
    render(<FinancialStatementConfigurationImport companyId={fixtureCompanyId} report={report} locale="en" onApply={vi.fn()} />);
    expect(screen.getByLabelText('Import package settings from a file')).toBeDisabled();
  });
});
