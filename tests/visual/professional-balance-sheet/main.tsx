import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { BalanceSheetReport } from '@/components/finance/BalanceSheetReport';
import { renderBalanceSheetPages, type RenderedBalanceSheetPages } from '@/utils/balanceSheetExport';
import { locale, scenario, syntheticExportOptions } from './fixture';
import { getDownloadInspection, subscribeToDownloadInspection } from './downloadInspection';
import '@/index.css';
import './preview.css';

const initialParams = new URLSearchParams(window.location.search);
if (!initialParams.has('asOf')) initialParams.set('asOf', '2026-08-31');
if (!initialParams.has('compare')) initialParams.set('compare', '2025-12-31');
window.history.replaceState(null, '', `/?${initialParams}`);
document.documentElement.lang = locale;
document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';

function Harness() {
  const mount = useRef<HTMLDivElement>(null);
  const rendered = useRef<RenderedBalanceSheetPages | null>(null);
  const [result, setResult] = useState('Preview not rendered.');
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const downloads = useSyncExternalStore(subscribeToDownloadInspection, getDownloadInspection);
  useEffect(() => {
    // These URL modes exercise the real saved-version selection and review controls.
    if (['approved', 'reviewer', 'voided'].includes(scenario)) {
      const view = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="balance-sheet-report"] button'))
        .find(button => button.textContent?.trim() === (locale === 'ar' ? 'عرض النسخة' : 'View version'));
      view?.click();
    }
    return () => rendered.current?.dispose();
  }, []);

  const preview = async (stress: boolean) => {
    setBusy(true); setResult('Measuring actual browser layout…'); setShowPreview(true);
    rendered.current?.dispose(); rendered.current = null;
    try {
      const pages = await renderBalanceSheetPages(syntheticExportOptions(stress));
      pages.element.style.cssText = 'position:static;width:794px;background:transparent;margin:0 auto';
      mount.current!.replaceChildren(pages.element); rendered.current = pages;
      const overflow = pages.pages.map((page, index) => {
        const body = page.querySelector<HTMLElement>('.bs-content')!;
        return { page: index + 1, vertical: body.scrollHeight > body.clientHeight + 1, horizontal: body.scrollWidth > body.clientWidth + 1, height: body.clientHeight, used: body.scrollHeight };
      });
      const failures = overflow.filter(page => page.vertical || page.horizontal);
      setResult(JSON.stringify({ mode: stress ? 'stress' : 'normal', pages: pages.pages.length, overflowCount: failures.length, measurements: overflow }, null, 2));
    } catch (error) { setResult(`ERROR: ${error instanceof Error ? error.message : String(error)}`); }
    finally { setBusy(false); }
  };

  return <>
    <aside className="fixture-toolbar" dir="ltr" aria-label="Synthetic test controls">
      <strong>LOCAL TEST FIXTURE · Synthetic data only · No database/RPC access</strong>
      <nav aria-label="Visual test scenarios">{['draft', 'approved', 'reviewer', 'error', 'blocked', 'currency', 'readonly', 'voided'].map(state => <a key={state} href={`/?lang=${locale}&state=${state}&asOf=2026-08-31&compare=2025-12-31`}>{state}</a>)}<a href={`/?lang=${locale === 'ar' ? 'en' : 'ar'}&state=${scenario}&asOf=2026-08-31&compare=2025-12-31`}>{locale === 'ar' ? 'English' : 'العربية'}</a></nav>
      <div className="fixture-actions"><button id="preview-normal" disabled={busy} onClick={() => void preview(false)}>Render normal A4 pages</button><button id="preview-stress" disabled={busy} onClick={() => void preview(true)}>Render long names / notes</button><button onClick={() => setShowPreview(value => !value)}>{showPreview ? 'Show application report' : 'Show A4 preview'}</button></div>
      <output id="pagination-result" aria-live="polite"><pre>{result}</pre></output>
      <output id="download-result" aria-live="polite" aria-label="Generated download inspection"><pre>{downloads}</pre></output>
    </aside>
    <main className="fixture-app" hidden={showPreview}><BalanceSheetReport /></main>
    <section className="fixture-preview" hidden={!showPreview} aria-label="Measured A4 document preview"><div ref={mount} /></section>
    <Toaster position="bottom-center" />
  </>;
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><Harness /></BrowserRouter>);
