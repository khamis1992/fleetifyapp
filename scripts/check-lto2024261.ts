import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  // البحث عن العقد
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_number')
    .ilike('contract_number', '%LTO2024261%')
    .limit(5);
  
  console.log('Contracts found:', contracts);
  
  if (!contracts || contracts.length === 0) {
    console.log('No contract found');
    return;
  }
  
  const contractId = contracts[0].id;
  
  // جلب الفواتير
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, status')
    .eq('contract_id', contractId)
    .order('due_date', { ascending: false });
  
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('\nInvoices for contract:');
  for (const inv of invoices || []) {
    const date = inv.due_date || inv.invoice_date;
    const day = date ? parseInt(date.split('-')[2]) : 0;
    const marker = day !== 1 ? ' ⚠️ NOT DAY 1' : '';
    const cancelled = inv.status === 'cancelled' ? ' [CANCELLED]' : '';
    console.log(`  ${inv.invoice_number} | ${date} | ${inv.status}${marker}${cancelled}`);
  }
  
  // عد الفواتير غير الملغاة بتاريخ خاطئ
  const wrongDates = (invoices || []).filter(inv => {
    if (inv.status === 'cancelled') return false;
    const date = inv.due_date || inv.invoice_date;
    if (!date) return false;
    const day = parseInt(date.split('-')[2]);
    return day !== 1;
  });
  
  console.log(`\n⚠️ Active invoices with wrong date: ${wrongDates.length}`);
}

check();
