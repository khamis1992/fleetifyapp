import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkContract() {
  // جلب العقد
  const { data: contract, error: contractErr } = await supabase
    .from('contracts')
    .select('id, contract_number')
    .eq('contract_number', 'LTO2024261')
    .single();
    
  if (contractErr) {
    console.log('Contract error:', contractErr);
    return;
  }
  
  console.log('Contract:', contract);
  
  // جلب جميع الفواتير لهذا العقد (بما فيها الملغاة)
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, status')
    .eq('contract_id', contract.id)
    .order('due_date', { ascending: false });
    
  if (error) {
    console.log('Error:', error);
    return;
  }
  
  console.log('\nAll invoices for contract LTO2024261:');
  for (const inv of invoices || []) {
    const date = inv.due_date || inv.invoice_date;
    const day = date ? parseInt(date.split('-')[2]) : 0;
    const marker = day !== 1 ? ' ⚠️ NOT DAY 1' : '';
    console.log(`  ${inv.invoice_number} | ${date} | ${inv.status}${marker}`);
  }
  
  // عد الفواتير بتاريخ غير صحيح وليست ملغاة
  const wrongDates = (invoices || []).filter(inv => {
    if (inv.status === 'cancelled') return false;
    const date = inv.due_date || inv.invoice_date;
    if (!date) return false;
    const day = parseInt(date.split('-')[2]);
    return day !== 1;
  });
  
  console.log(`\n⚠️ Wrong date invoices (not cancelled): ${wrongDates.length}`);
  for (const inv of wrongDates) {
    console.log(`  ${inv.invoice_number} | ${inv.due_date || inv.invoice_date}`);
  }
}

checkContract();
