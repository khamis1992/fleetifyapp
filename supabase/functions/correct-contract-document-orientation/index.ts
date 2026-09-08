import { createClient } from '@supabase/supabase-js';
import * as pdfLib from 'pdf-lib';
import { correctPdfOrientation, MAX_ORIENTATION_BYTES, validatePdfRotations } from '../_shared/pdf-orientation.ts';
import { validateAutomaticEvidence } from '../_shared/automatic-pdf-orientation.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'Content-Type': 'application/json' },
});
const sha256 = async (bytes: Uint8Array) => Array.from(new Uint8Array(
  await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer),
), (byte) => byte.toString(16).padStart(2, '0')).join('');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  try {
    const authorization = req.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return respond({ error: 'يلزم تسجيل الدخول' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const text = await req.text();
    if (text.length > 64000) return respond({ error: 'الطلب أكبر من الحد المسموح' }, 413);
    const body = JSON.parse(text);
    const automatic = ['auto_inspect', 'auto_save'].includes(body.action);
    const sourceType = body.sourceType ?? 'contract';
    if (!['contract', 'customer'].includes(sourceType) || (automatic && sourceType !== 'contract')) {
      return respond({ error: 'مصدر المستند غير مدعوم لهذه العملية' }, 400);
    }
    const customerDocument = sourceType === 'customer';
    let actorId: string | null = null;
    if (automatic) {
      // A real service caller plus a live, governed machine lease is required.
      // The RPC rechecks the policy, company pause and lease inside COMMIT.
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!serviceKey || authorization !== `Bearer ${serviceKey}` || !uuid.test(body.agentRequestId || '')) {
        return respond({ error: 'Unauthorized machine invocation' }, 401);
      }
    } else {
      const authClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authorization } }, auth: { persistSession: false },
      });
      const { data: { user }, error: authError } = await authClient.auth.getUser(authorization.slice(7));
      if (authError || !user) return respond({ error: 'انتهت الجلسة؛ سجل الدخول مجددًا' }, 401);
      actorId = user.id;
    }
    if (!['inspect', 'save', 'auto_inspect', 'auto_save'].includes(body.action)
      || ![body.companyId, body.contractId, body.documentId].every((id) => typeof id === 'string' && uuid.test(id))) {
      return respond({ error: 'بيانات المستند غير صالحة' }, 400);
    }
    const saving = body.action === 'save' || body.action === 'auto_save';
    const rotations = saving ? validatePdfRotations(body.rotations) : null;
    if (automatic && saving) validateAutomaticEvidence(rotations!, body.evidence);
    if (saving && (!uuid.test(body.requestId || '') || typeof body.revision !== 'string' || !/^[a-f0-9]{32}$/.test(body.revision)
      || typeof body.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(body.sourceSha256))) {
      return respond({ error: 'افتح معاينة التصحيح مجددًا' }, 400);
    }
    // This key never leaves the function; all row access is authorized by the
    // service-only RPC against the verified user's active company profile.
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const args = {
      p_company_id: body.companyId, p_contract_id: body.contractId, p_document_id: body.documentId,
      p_actor_id: actorId,
      ...(automatic ? { p_agent_request_id: body.agentRequestId, p_evidence: saving ? body.evidence : null } : {}),
      ...(saving ? { p_request_id: body.requestId, p_expected_revision: body.revision, p_rotations: rotations, p_source_sha256: body.sourceSha256 } : {}),
    };
    const rpc = automatic ? 'process_automatic_contract_orientation_v1'
      : customerDocument ? 'process_customer_document_orientation_v1' : 'process_contract_document_orientation_v1';
    const { data: preview, error: previewError } = await service.rpc(rpc, args);
    if (previewError) throw new Error(previewError.message);
    if (preview.saved) return respond(preview);
    if (preview.file_size > MAX_ORIENTATION_BYTES) throw new Error('الحد الأقصى لتصحيح الملف 25 ميجابايت');
    const bucket = customerDocument ? 'documents' : 'contract-documents';
    const storage = service.storage.from(bucket);
    const { data: original, error: downloadError } = await storage.download(preview.file_path);
    if (downloadError || !original) throw new Error('تعذر قراءة أصل المستند من التخزين');
    const source = new Uint8Array(await original.arrayBuffer());
    if (source.length > MAX_ORIENTATION_BYTES) throw new Error('الحد الأقصى لتصحيح الملف 25 ميجابايت');
    const sourceHash = await sha256(source);
    if (!saving) {
      if (customerDocument) return respond({ ...preview, source_sha256: sourceHash, automatic_check: null });
      const { data: check } = await service.from('contract_document_orientation_checks')
        .select('status,checked_at,corrected_pages,review_pages,file_path').eq('company_id', body.companyId)
        .eq('document_id', body.documentId).eq('file_path', preview.file_path).maybeSingle();
      return respond({ ...preview, source_bucket: bucket, source_sha256: sourceHash, automatic_check: check || null });
    }
    if (body.sourceSha256 !== sourceHash) throw new Error('تغير محتوى الملف بعد فتح المعاينة؛ افتح التصحيح مجددًا');
    const output = await correctPdfOrientation(source, rotations, pdfLib);
    // The owner comes from the authorized RPC, never from client-supplied paths.
    if (customerDocument && !uuid.test(preview.source_owner_id || '')) throw new Error('تعذر تحديد مالك المستند');
    const prefix = customerDocument ? `customer-documents/${preview.source_owner_id}` : body.contractId;
    const path = `${prefix}/orientation/${body.documentId}/${body.requestId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await storage.upload(path, output, { contentType: 'application/pdf', upsert: false });
    if (uploadError) throw new Error('تعذر حفظ النسخة المصححة؛ لم يتم تغيير المستند');
    const { data: saved, error: commitError } = await service.rpc(rpc, {
      ...args, p_new_path: path, p_source_sha256: sourceHash, p_output_sha256: await sha256(output), p_file_size: output.length,
    });
    if (commitError) {
      // A network failure can occur after COMMIT: never remove the saved PDF
      // until the authoritative request record confirms it is unreferenced.
      let historyQuery = service.from(customerDocument ? 'customer_document_orientation_revisions' : 'contract_document_orientation_revisions')
        .select('corrected_file_path, rotations').eq('request_id', body.requestId).eq('company_id', body.companyId)
        .eq('document_id', body.documentId).eq('previous_revision', body.revision);
      historyQuery = automatic ? historyQuery.is('actor_id', null).eq('agent_request_id', body.agentRequestId) : historyQuery.eq('actor_id', actorId!);
      const { data: history, error: historyError } = await historyQuery.maybeSingle();
      if (!historyError && history?.corrected_file_path !== path) await storage.remove([path]);
      if (history && !historyError && JSON.stringify(history.rotations) === JSON.stringify(rotations)) return respond({ saved: true, replayed: true, request_id: body.requestId, file_path: history.corrected_file_path });
      throw new Error(commitError.message);
    }
    if (saved.file_path !== path) await storage.remove([path]); // concurrent replay won
    return respond(saved);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'تعذر حفظ تصحيح الاتجاه' }, 400);
  }
});
