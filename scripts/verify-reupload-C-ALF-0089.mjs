import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#') || !s.includes('=')) continue;
    const i = s.indexOf('=');
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[s.slice(0, i).trim()] = v;
  }
  return out;
}
const env = loadEnv(join(root, '.env.local'));
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const password = process.env.FLEETIFY_PASSWORD;
const { error: authErr } = await sb.auth.signInWithPassword({ email: 'khamis-1992@hotmail.com', password });
if (authErr) { console.log(JSON.stringify({ ok:false, error: authErr.message })); process.exit(1); }
const docId = '68807bc8-426d-4fff-bde6-faeb7ddb38ff';
const contractId = 'd736d561-0a3f-490d-a791-36a481268c47';
const { data: doc, error: e1 } = await sb.from('contract_documents').select('id,contract_id,document_type,document_name,file_path,file_size,created_at').eq('id', docId).single();
const { data: all } = await sb.from('contract_documents').select('id,document_name,file_path,created_at').eq('contract_id', contractId).eq('document_type', 'signed_contract').order('created_at', { ascending: false });
const { data: listed, error: e2 } = await sb.storage.from('contract-documents').list('signed-agreements/24bc0b21-4e2d-4413-9842-31719a3669f4', { search: '1787427599735_ef53e5fe' });
const desktop = existsSync('C:\\Users\\khamis\\Desktop\\عقود\\عمار العزيز غوزي.pdf');
console.log(JSON.stringify({
  ok: !e1 && !!doc,
  doc,
  signedCount: (all || []).length,
  signedIds: (all || []).map(x => x.id),
  storageListed: (listed || []).map(x => ({ name: x.name, size: x.metadata?.size })),
  storageErr: e2?.message || null,
  desktopIntact: desktop,
}, null, 2));
