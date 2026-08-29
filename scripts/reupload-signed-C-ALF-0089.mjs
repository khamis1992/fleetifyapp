import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const env = { ...loadEnv(join(root, '.env.local')), ...process.env };
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error(JSON.stringify({ ok: false, error: 'missing_supabase_env' }));
  process.exit(1);
}

const email = process.env.FLEETIFY_EMAIL || 'khamis-1992@hotmail.com';
const password = process.env.FLEETIFY_PASSWORD;
if (!password) {
  console.error(JSON.stringify({ ok: false, error: 'missing_password_env' }));
  process.exit(1);
}

const pdfPath = process.env.PDF_PATH;
const contractNumber = process.env.CONTRACT_NUMBER || 'C-ALF-0089';
if (!pdfPath || !existsSync(pdfPath)) {
  console.error(JSON.stringify({ ok: false, error: 'pdf_not_found', pdfPath }));
  process.exit(1);
}

const supabase = createClient(url, anon);
const report = { ok: false, contractNumber, pdfPath };

async function main() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr || !authData?.user) {
    report.error = 'auth_failed';
    report.authMessage = authErr?.message || 'no_user';
    console.log(JSON.stringify(report));
    process.exit(1);
  }
  const userId = authData.user.id;
  report.userId = userId;

  // profiles may use user_id or id
  let companyId = null;
  {
    const { data: p1 } = await supabase.from('profiles').select('company_id').eq('user_id', userId).maybeSingle();
    companyId = p1?.company_id || null;
  }
  if (!companyId) {
    const { data: p2 } = await supabase.from('profiles').select('company_id').eq('id', userId).maybeSingle();
    companyId = p2?.company_id || null;
  }
  if (!companyId) {
    report.error = 'company_id_not_found';
    console.log(JSON.stringify(report));
    process.exit(1);
  }
  report.companyId = companyId;

  const { data: contract, error: cErr } = await supabase
    .from('contracts')
    .select('id, contract_number, company_id, customer_id, status')
    .eq('company_id', companyId)
    .eq('contract_number', contractNumber)
    .maybeSingle();

  if (cErr || !contract) {
    report.error = 'contract_not_found';
    report.contractError = cErr?.message || null;
    console.log(JSON.stringify(report));
    process.exit(1);
  }
  report.contractId = contract.id;
  report.customerId = contract.customer_id;
  report.contractStatus = contract.status;

  // Optional customer name check
  if (contract.customer_id) {
    const { data: cust } = await supabase
      .from('customers')
      .select('id, first_name, last_name, company_name, customer_type')
      .eq('id', contract.customer_id)
      .maybeSingle();
    if (cust) {
      report.customerName = [cust.first_name, cust.last_name].filter(Boolean).join(' ') || cust.company_name || null;
    }
  }

  // Existing signed_contract docs
  const { data: existing } = await supabase
    .from('contract_documents')
    .select('id, document_type, document_name, file_path, uploaded_at, created_at')
    .eq('contract_id', contract.id)
    .eq('document_type', 'signed_contract')
    .order('created_at', { ascending: false });
  report.existingSignedCount = (existing || []).length;
  report.existingSigned = (existing || []).slice(0, 5).map(d => ({ id: d.id, name: d.document_name, path: d.file_path, at: d.uploaded_at || d.created_at }));

  const buf = readFileSync(pdfPath);
  const uniqueId = `${Date.now()}_${randomBytes(4).toString('hex')}`;
  const fileName = `signed-agreements/${companyId}/${uniqueId}.pdf`;
  const documentName = process.env.DOCUMENT_NAME || 'عمار العزيز غوزي.pdf';

  const { error: upErr } = await supabase.storage
    .from('contract-documents')
    .upload(fileName, buf, { contentType: 'application/pdf', upsert: false });

  if (upErr) {
    report.error = 'storage_upload_failed';
    report.uploadMessage = upErr.message;
    console.log(JSON.stringify(report));
    process.exit(1);
  }
  report.filePath = fileName;
  report.fileSize = buf.length;

  const { data: doc, error: dbErr } = await supabase
    .from('contract_documents')
    .insert({
      company_id: companyId,
      contract_id: contract.id,
      document_type: 'signed_contract',
      document_name: documentName,
      file_path: fileName,
      file_size: buf.length,
      mime_type: 'application/pdf',
      uploaded_by: userId,
      is_required: false,
      notes: 'Re-upload after false deletion; source Desktop عقود/عمار العزيز غوزي.pdf for C-ALF-0089',
    })
    .select('id, contract_id, document_type, document_name, file_path, file_size, created_at')
    .single();

  if (dbErr) {
    await supabase.storage.from('contract-documents').remove([fileName]);
    report.error = 'db_insert_failed';
    report.dbMessage = dbErr.message;
    console.log(JSON.stringify(report));
    process.exit(1);
  }

  report.ok = true;
  report.document = doc;

  // Verify Desktop file still exists
  report.desktopFileStillExists = existsSync(pdfPath);

  const outPath = join(root, 'tmp', 'reupload-C-ALF-0089-result.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  report.resultPath = outPath;
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.log(JSON.stringify({ ok: false, error: 'exception', message: String(e?.message || e) }));
  process.exit(1);
});
