import React, { Suspense, lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TourProvider } from '@/components/tour-guide';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { FinanceWorkspaceNav } from '@/components/finance/workspace/FinanceWorkspaceNav';
import BentoSidebar from '@/components/dashboard/bento/BentoSidebar';
import Finance from '@/pages/Finance';
import { initializeI18n } from '@/lib/i18n/config';
import { Menu } from 'lucide-react';
import '@/index.css';
const Vendors=lazy(()=>import('@/pages/finance/Vendors'));
const VendorCategories=lazy(()=>import('@/pages/finance/VendorCategories'));
const PurchaseOrders=lazy(()=>import('@/pages/finance/PurchaseOrders'));
const FinancialTracking=lazy(()=>import('@/pages/FinancialTracking'));
const Scanner=lazy(()=>import('@/pages/InvoiceScannerPage'));
const QuickPayment=lazy(()=>import('@/pages/finance/LegacyFinanceRedirect'));
const Excel=lazy(()=>import('@/pages/payments/ExcelPaymentImport'));
const Aging=lazy(()=>import('@/pages/finance/ARAgingReport'));
const PaymentTracking=lazy(()=>import('@/pages/finance/PaymentTracking'));
const Registration=lazy(()=>import('@/pages/PaymentRegistration'));
const Sync=lazy(()=>import('@/pages/SyncPaymentsToLedger'));
const client=new QueryClient({defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false}}});
function App() {
  const [collapsed,setCollapsed]=useState(window.innerWidth<1280);
  const [mobile,setMobile]=useState(false);
  return <QueryClientProvider client={client}><TooltipProvider><FinanceProvider><TourProvider>
    <div dir="rtl" className="min-h-screen bg-[#f3f6f5]">
      <div className="hidden lg:block fixed top-3 right-3 bottom-3 z-30"><BentoSidebar collapsed={collapsed} onCollapsedChange={setCollapsed} /></div>
      <button className="m-3 rounded-lg border bg-white p-2 lg:hidden" aria-label="فتح القائمة" onClick={()=>setMobile(true)}><Menu /></button>
      {mobile && <div className="fixed inset-0 z-50 bg-black/30" onClick={()=>setMobile(false)}><div className="absolute inset-y-0 right-0" onClick={e=>e.stopPropagation()}><BentoSidebar isMobile onCloseMobile={()=>setMobile(false)} /></div></div>}
      <main className={`bento-workspace-main p-4 md:p-6 ${collapsed ? 'sidebar-is-collapsed' : ''}`}><div className="finance-system"><FinanceWorkspaceNav /><div className="finance-page-body"><Suspense fallback={<p role="status">تحميل…</p>}><Routes>
        <Route path="/finance/payments/register" element={<Registration />} /><Route path="/finance/sync-payments" element={<Sync />} />
        <Route path="/finance/vendors" element={<Vendors />} /><Route path="/finance/vendors/categories" element={<VendorCategories />} /><Route path="/finance/purchase-orders" element={<PurchaseOrders />} />
        <Route path="/finance/tracking" element={<FinancialTracking />} /><Route path="/finance/invoice-scanner" element={<Scanner />} /><Route path="/finance/payments/quick" element={<QuickPayment />} /><Route path="/finance/payments/import-excel" element={<Excel />} />
        <Route path="/finance/reports/ar-aging" element={<Aging />} /><Route path="/finance/payments/tracking" element={<PaymentTracking />} /><Route path="/finance/*" element={<Finance />} />
      </Routes></Suspense></div></div></main>
    </div>
  </TourProvider></FinanceProvider></TooltipProvider></QueryClientProvider>;
}
document.body.setAttribute('data-finance-active','');
initializeI18n().then(() => createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>));
