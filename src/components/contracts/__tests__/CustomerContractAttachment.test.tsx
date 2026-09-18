import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerContractAttachment } from '../CustomerContractAttachment';
import type { ContractDocument } from '@/hooks/useContractDocuments';

const mocks=vi.hoisted(()=>({create:vi.fn(),download:vi.fn(),bucket:vi.fn()}));
vi.mock('@/hooks/useContractDocuments',()=>({useCreateContractDocument:()=>({mutateAsync:mocks.create})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{storage:{from:mocks.bucket}}}));
const doc:ContractDocument={
  id:'customer-document',company_id:'company',contract_id:'contract',document_name:'signed.pdf',document_type:'signed_contract',
  sourceType:'customer',sourceOwnerId:'customer',sourceBucket:'documents',file_path:'customer-documents/customer/signed.pdf',
  uploaded_at:null,is_required:false,created_at:null,updated_at:null,mime_type:'application/pdf',
};
beforeEach(()=>{
  vi.clearAllMocks();mocks.bucket.mockReturnValue({download:mocks.download});
  mocks.download.mockResolvedValue({data:new Blob(['pdf'],{type:'application/pdf'}),error:null});
  mocks.create.mockResolvedValue({id:'new-contract-copy'});
});
describe('attaching a stored customer contract for identity review',()=>{
  it('uses the reviewed upload and current contract without marking the customer original matched',async()=>{
    render(<CustomerContractAttachment document={doc} contractId="contract" documents={[doc]} />);
    fireEvent.click(screen.getByRole('button',{name:'إرفاق بالعقد للمطابقة'}));
    await waitFor(()=>expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.bucket).toHaveBeenCalledWith('documents');
    expect(mocks.download).toHaveBeenCalledWith(doc.file_path);
    const input=mocks.create.mock.calls[0][0];
    expect(input).toMatchObject({contract_id:'contract',document_type:'signed_contract',document_name:'signed.pdf',is_required:true});
    expect(input.file).toBeInstanceOf(File);
    expect(input.notes).toContain('[customer-document:customer-document]');
    expect(input).not.toHaveProperty('legal_identity_match_status');
    expect(await screen.findByRole('button',{name:'أُرفقت نسخة بهذا العقد'})).toBeDisabled();
    expect(doc.sourceType).toBe('customer');
  });
  it('prevents repeating an already attached source after reopening',()=>{
    const copy={...doc,id:'copy',sourceType:'contract' as const,notes:'[customer-document:customer-document]'};
    render(<CustomerContractAttachment document={doc} contractId="contract" documents={[doc,copy]} />);
    expect(screen.getByRole('button',{name:'أُرفقت نسخة بهذا العقد'})).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('hands the saved contract-owned copy to manual review after successful attachment',async()=>{
    const onAttached=vi.fn();
    const saved={...doc,id:'saved-copy',contract_id:'contract',file_path:'contract/saved.pdf'};
    mocks.create.mockResolvedValue(saved);
    render(<CustomerContractAttachment document={doc} contractId="contract" documents={[doc]}
      buttonLabel="إرفاق النسخة ومتابعة الاعتماد" onAttached={onAttached} />);
    fireEvent.click(screen.getByRole('button',{name:'إرفاق النسخة ومتابعة الاعتماد'}));
    await waitFor(()=>expect(onAttached).toHaveBeenCalledOnce());
    expect(onAttached).toHaveBeenCalledWith({...saved,sourceType:'contract',sourceBucket:'contract-documents'});
  });
  it('does not open approval after failed creation or for a returned copy from another contract',async()=>{
    const onAttached=vi.fn();
    mocks.create.mockRejectedValueOnce(new Error('تعذر حفظ النسخة'));
    render(<CustomerContractAttachment document={doc} contractId="contract" documents={[doc]} onAttached={onAttached} />);
    fireEvent.click(screen.getByRole('button',{name:'إرفاق بالعقد للمطابقة'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر حفظ النسخة');
    expect(onAttached).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({...doc,id:'wrong-copy',contract_id:'another-contract'});
    fireEvent.click(screen.getByRole('button',{name:'إرفاق بالعقد للمطابقة'}));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('تعذر فتح المطابقة'));
    expect(onAttached).not.toHaveBeenCalled();
  });
  it('keeps download failure retryable without uploading anything',async()=>{
    mocks.download.mockResolvedValue({data:null,error:new Error('storage unavailable')});
    render(<CustomerContractAttachment document={doc} contractId="contract" documents={[doc]} />);
    fireEvent.click(screen.getByRole('button',{name:'إرفاق بالعقد للمطابقة'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر تحميل مستند العميل');
    expect(screen.getByRole('button',{name:'إرفاق بالعقد للمطابقة'})).toBeEnabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([{sourceType:'contract' as const},{document_type:'identity'}])('does not offer attachment for an ineligible source %s',(patch)=>{
    render(<CustomerContractAttachment document={{...doc,...patch}} contractId="contract" documents={[doc]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
