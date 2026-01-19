import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkContract() {
  // جلب الفواتير مباشرة بناءً على رقمها
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, status, contract_id')
    .or('invoice_number.ilike.%LTO2024261%,invoice_number.ilike.%C-ALF-0064%')
    .neq('status', 'cancelled')
    .order('due_date', { ascending: false });
    
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('Invoices found:', invoices?.length);
  
  // تجميع حسب الشهر
  const byMonth = new Map<string, any[]>();
  for (const inv of invoices || []) {
    const date = inv.due_date || inv.invoice_date;
    if (!date) continue;
    const month = date.substring(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(inv);
  }
  
  console.log('\nInvoices by month:');
  for (const [month, invs] of Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`\n${month} (${invs.length} invoices):`);
    for (const inv of invs) {
      const date = inv.due_date || inv.invoice_date;
      const day = parseInt(date.split('-')[2]);
      const marker = day !== 1 ? ' ⚠️' : ' ✅';
      console.log(`  ${inv.invoice_number} | ${date}${marker}`);
    }
  }
  
  // الفواتير بتاريخ غير يوم 1
  const wrongDates = (invoices || []).filter(inv => {
    const date = inv.due_date || inv.invoice_date;
    if (!date) return false;
    const day = parseInt(date.split('-')[2]);
    return day !== 1;
  });
  
  console.log(`\n\n⚠️ Invoices with wrong date (not day 1): ${wrongDates.length}`);
  for (const inv of wrongDates) {
    console.log(`  ${inv.id} | ${inv.invoice_number} | ${inv.due_date || inv.invoice_date}`);
  }
}

checkContract();
