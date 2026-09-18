import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { FinancialStatementPackageReport } from '../../../src/components/finance/FinancialStatementPackageReport';
import { exportFinancialStatementPackageExcel, exportFinancialStatementPackagePDF, printFinancialStatementPackage, renderFinancialStatementPackagePages, type RenderedFinancialStatementPackagePages } from '../../../src/utils/financialStatementPackageExport';
import type { FinancialStatementPackageExportOptions } from '../../../src/types/financialStatementPackage';
import { makeFinancialStatementPackageFixture, makeSavedFinancialStatementPackageFixture } from './fixtureData';
import { getDownloadInspection, subscribeToDownloadInspection } from '../professional-balance-sheet/downloadInspection';
import '../../../src/index.css';
import './preview.css';

const query = new URLSearchParams(location.search);
const locale = query.get('lang') === 'en' ? 'en' : 'ar';
const initialStress = query.get('stress') === 'true';
const snapshotStatus = query.get('status') || 'draft';
const showUI = query.get('view') === 'ui';
function exportOptions(stress: boolean): FinancialStatementPackageExportOptions {
  const report = makeFinancialStatementPackageFixture(stress);
  if (query.get('findings') === 'true') {
    report.configuration.notes[0].status = 'pending';
    report.findings.push({ code: 'disclosures_incomplete', severity: 'error', count: 1, messageAr: 'الإيضاحات تحتاج إلى استكمال قبل الاعتماد', messageEn: 'Disclosures must be completed before approval', accountIds: [], journalIds: [] });
  }
  return { report, locale, snapshot: ['draft', 'approved', 'voided'].includes(snapshotStatus) ? makeSavedFinancialStatementPackageFixture(report, snapshotStatus as 'draft' | 'approved' | 'voided') : null };
}
function App() {
  const [busy, setBusy] = useState(false), [stress, setStress] = useState(initialStress), [result, setResult] = useState('Preparing measured pages…');
  const preview = useRef<HTMLDivElement>(null), rendered = useRef<RenderedFinancialStatementPackagePages | null>(null);
  const downloads = useSyncExternalStore(subscribeToDownloadInspection, getDownloadInspection);
  const perform = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { setResult(`ERROR: ${error instanceof Error ? error.message : String(error)}`); } finally { setBusy(false); } };
  const paginate = async (long: boolean) => {
    rendered.current?.dispose(); rendered.current = null;
    const value = await renderFinancialStatementPackagePages(exportOptions(long));
    value.element.style.cssText = '';
    preview.current!.replaceChildren(value.element); rendered.current = value;
    const pages = value.pages.map((page, index) => {
      const content = page.querySelector<HTMLElement>('.fsp-content')!;
      return { page: index + 1, orientation: page.classList.contains('fsp-landscape') ? 'landscape' : 'portrait', contentHeight: content.clientHeight, scrollHeight: content.scrollHeight, contentWidth: content.clientWidth, scrollWidth: content.scrollWidth, overflow: content.scrollHeight > content.clientHeight + 1 || content.scrollWidth > content.clientWidth + 1 };
    });
    setResult(JSON.stringify({ locale, stress: long, requestedStatus: snapshotStatus, pages: pages.length, overflow: pages.filter(page => page.overflow).length, details: pages }, null, 2));
    setStress(long);
  };
  useEffect(() => { if (!showUI) void perform(() => paginate(initialStress)); else setResult('Actual production UI with synthetic hook and service mocks'); return () => rendered.current?.dispose(); }, []);
  return <>
    <header className="fsp-fixture-toolbar" dir="ltr">
      <strong>Financial statement package / بيانات اختبار فقط — no network or company data</strong>
      <nav><a href="?lang=ar&status=draft">Arabic draft</a><a href="?lang=en&status=draft">English draft</a><a href="?lang=ar&status=approved">Arabic approved</a><a href="?lang=en&status=approved">English approved</a><a href="?lang=ar&status=voided">Voided</a><a href="?lang=en&findings=true">Incomplete notes</a><a href="?view=ui&lang=ar">Arabic production UI</a><a href="?view=ui&lang=en&actor=reviewer">English reviewer UI</a></nav>
      <div className="fsp-fixture-actions">
        <button disabled={busy} onClick={() => void perform(() => paginate(false))}>Render normal pages</button>
        <button disabled={busy} onClick={() => void perform(() => paginate(true))}>Render stress pages</button>
        <button disabled={busy} onClick={() => void perform(() => exportFinancialStatementPackagePDF(exportOptions(stress)))}>Export actual PDF</button>
        <button disabled={busy} onClick={() => void perform(() => exportFinancialStatementPackageExcel(exportOptions(stress)))}>Export actual Excel</button>
        <button disabled={busy} onClick={() => void perform(() => printFinancialStatementPackage(exportOptions(stress)))}>Print actual package</button>
      </div>
      <pre id="pagination-result" aria-live="polite">{result}</pre>
      <pre id="download-result" aria-live="polite">{downloads}</pre>
    </header>
    {showUI && <div className="fsp-fixture-app"><BrowserRouter><FinancialStatementPackageReport /><Toaster /></BrowserRouter></div>}
    <main className="fsp-fixture-preview" ref={preview} aria-label="Measured financial statement pages" />
  </>;
}
const applicationRoot = import.meta.hot?.data.root || createRoot(document.getElementById('root')!);
if (import.meta.hot) import.meta.hot.data.root = applicationRoot;
applicationRoot.render(<App />);
