import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DocumentOrientationDialog from '../DocumentOrientationDialog';

const mocks=vi.hoisted(()=>({ invoke:vi.fn(), render:vi.fn(), detect:vi.fn(), invalidate:vi.fn(), success:vi.fn(), bucket:vi.fn() }));
vi.mock('@/services/contractDocumentOrientation',()=>({invokeDocumentOrientation:mocks.invoke}));
vi.mock('@/utils/pdfOrientation',()=>({renderOrientationPages:mocks.render,detectPageOrientations:mocks.detect}));
vi.mock('@/utils/contractDocumentQueries',()=>({invalidateContractDocumentDependents:mocks.invalidate}));
vi.mock('sonner',()=>({toast:{success:mocks.success}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:mocks.bucket}}}));
const doc={id:'doc',company_id:'company',contract_id:'contract',document_name:'signed.pdf',document_type:'signed_contract',uploaded_at:null,is_required:true,created_at:null,updated_at:null};
let preview: Record<string,unknown>;
beforeEach(async()=>{
  vi.clearAllMocks(); vi.stubGlobal('crypto',webcrypto);
  mocks.bucket.mockReturnValue({download:async()=>({data:{arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer},error:null})});
  const hash=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',new Uint8Array([1,2,3]))),(b)=>b.toString(16).padStart(2,'0')).join('');
  preview={revision:'rev',source_sha256:hash,can_save:true,file_path:'source.pdf',history:[]};
  mocks.render.mockResolvedValue([{image:'data:image/png;base64,AA==',width:300,height:500},{image:'data:image/png;base64,AA==',width:300,height:500}]);
  mocks.invoke.mockImplementation(async(_doc,save)=>save?{saved:true,request_id:save.requestId,file_path:'corrected.pdf'}:preview);
  mocks.invalidate.mockResolvedValue(undefined);
});
function setup(document = doc as typeof doc & {sourceType?: 'customer' | 'contract'}){
  const close=vi.fn(),saved=vi.fn(),client=new QueryClient();
  render(<QueryClientProvider client={client}><DocumentOrientationDialog document={document} onClose={close} onSaved={saved}/></QueryClientProvider>);
  return {close,saved,client};
}
async function review(){
  fireEvent.click(screen.getByRole('button',{name:/الاتجاه صحيح، التالي/}));
  fireEvent.click(screen.getByRole('button',{name:'الاتجاه صحيح'}));
  fireEvent.click(screen.getByRole('checkbox'));
}
describe('saved PDF editor',()=>{
  it('loads a customer PDF from its authorized bucket and refreshes every affected contract after save',async()=>{
    preview.source_bucket='documents'; preview.affected_contract_ids=['contract','second-contract'];
    const customerDoc={...doc,sourceType:'customer' as const};
    const {client}=setup(customerDoc);
    await screen.findByRole('button',{name:'تدوير الكل 180°'});
    expect(mocks.bucket).toHaveBeenCalledWith('documents');
    expect(screen.getByText(/هذا مستند من ملف العميل/)).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'تدوير الكل 180°'})); await review();
    fireEvent.click(screen.getByRole('button',{name:'حفظ التصحيح'}));
    await waitFor(()=>expect(mocks.invalidate).toHaveBeenCalledWith(client,'company','second-contract'));
    expect(mocks.invoke).toHaveBeenLastCalledWith(customerDoc,expect.objectContaining({rotations:[180,180]}));
  });
  it('requires reviewing all changed pages and saves rotations with the source revision/hash',async()=>{
    const {saved,close,client}=setup();
    await screen.findByRole('button',{name:'تدوير الكل 180°'});
    fireEvent.click(screen.getByRole('button',{name:'تدوير الكل 180°'}));
    expect(screen.getByRole('button',{name:'حفظ التصحيح'})).toBeDisabled();
    await review(); fireEvent.click(screen.getByRole('button',{name:'حفظ التصحيح'}));
    await waitFor(()=>expect(saved).toHaveBeenCalledWith('corrected.pdf'));
    expect(mocks.invoke).toHaveBeenLastCalledWith(doc,expect.objectContaining({revision:'rev',sourceSha256:preview.source_sha256,rotations:[180,180]}));
    expect(close).toHaveBeenCalledOnce(); expect(mocks.invalidate).toHaveBeenCalledWith(client,'company','contract');
  });
  it('invalidates page review after another manual rotation',async()=>{
    setup(); await screen.findByRole('button',{name:'تدوير الكل 180°'});
    fireEvent.click(screen.getByRole('button',{name:'تدوير الكل 180°'})); await review();
    expect(screen.getByRole('button',{name:'حفظ التصحيح'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'تدوير الصفحة لليمين'}));
    expect(screen.getByRole('button',{name:'حفظ التصحيح'})).toBeDisabled();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
  it('keeps manual choices for pages whose automatic detection is uncertain',async()=>{
    mocks.detect.mockResolvedValue([{rotation:180,reliable:true,confidence:20},{rotation:0,reliable:false,confidence:3}]);
    setup(); await screen.findByRole('button',{name:'تدوير الكل 180°'});
    fireEvent.click(screen.getByRole('button',{name:'تدوير الكل 180°'}));
    fireEvent.click(screen.getByRole('button',{name:'اكتشاف الاتجاه تلقائيًا'}));
    await screen.findByText(/1 صفحة تحتاج/); await review();
    fireEvent.click(screen.getByRole('button',{name:'حفظ التصحيح'}));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenLastCalledWith(doc,expect.objectContaining({rotations:[180,180]})));
  });
  it('keeps the editor open after a rejected save and preserves the idempotency key for retry',async()=>{
    mocks.invoke.mockImplementation(async(_doc,save)=>{if(save) throw new Error('تغير المستند');return preview;});
    const {close}=setup(); await screen.findByRole('button',{name:'تدوير الكل 180°'});
    fireEvent.click(screen.getByRole('button',{name:'تدوير الكل 180°'}));await review();
    fireEvent.click(screen.getByRole('button',{name:'حفظ التصحيح'})); await screen.findByRole('alert');
    const requestId=mocks.invoke.mock.lastCall?.[1].requestId;
    fireEvent.click(screen.getByRole('button',{name:'حفظ التصحيح'}));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledTimes(3));
    expect(mocks.invoke.mock.lastCall?.[1].requestId).toBe(requestId);expect(close).not.toHaveBeenCalled();expect(mocks.success).not.toHaveBeenCalled();
  });
  it('disables modification when the server reports filed or queued evidence',async()=>{
    preview.can_save=false;setup();
    await screen.findByText(/النسخة مرتبطة بطلب رفع/);
    expect(screen.getByRole('button',{name:'تدوير الكل 180°'})).toBeDisabled();
    expect(screen.getByRole('button',{name:'حفظ التصحيح'})).toBeDisabled();
  });
});
