import { beforeEach,describe,expect,it,vi } from 'vitest';
import { convertSelectedContractsToLegal } from '../batchContractLegalConversion';
const { from,rpc,records,reads }=vi.hoisted(()=>({
  from:vi.fn(),rpc:vi.fn(),records:new Map<string,Record<string,unknown>>(),reads:[] as Record<string,string>[],
}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from,rpc}}));
const candidate={contract_id:'contract-1',customer_id:'customer-1',days_overdue:60};
const row={id:'contract-1',company_id:'company-1',customer_id:'customer-1',status:'active',vehicle_returned:false};
beforeEach(()=>{
  vi.clearAllMocks(); records.clear();reads.length=0;records.set(row.id,row);
  from.mockImplementation((table:string)=>{
    expect(table).toBe('contracts');
    const filters:Record<string,string>={};
    const query={select:vi.fn().mockReturnThis(),eq:vi.fn((key:string,value:string)=>{filters[key]=value;return query;}),
      maybeSingle:vi.fn(async()=>{reads.push(filters);return {data:records.get(filters.id) || null,error:null};})};
    return query;
  });
  rpc.mockImplementation(async(name:string,args:Record<string,unknown>)=>({error:null,data:name==='convert_contract_to_legal_collection_v2'?{
    legal_case:{id:`case-${args.p_contract_id}`,company_id:args.p_company_id,contract_id:args.p_contract_id,client_id:'customer-1'},
    case_number:`CASE-${args.p_contract_id}`,total_case_value:100,
    claim_scope:args.p_claim_scope,
  }:true}));
});
describe('batch conversion uses the actual shared guarded service',()=>{
  it('keeps two contracts for one customer separate, deduplicates selection and never sends browser claim values',async()=>{
    records.set('contract-2',{...row,id:'contract-2',vehicle_returned:true});
    const forged={...candidate,total_outstanding:999999};
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[forged,forged,{...candidate,contract_id:'contract-2'}]);
    expect(result.converted).toHaveLength(2);expect(result.failed).toEqual([]);
    expect(reads).toEqual([{company_id:'company-1',id:'contract-1'},{company_id:'company-1',id:'contract-2'}]);
    const commands=rpc.mock.calls.filter(([name])=>name==='convert_contract_to_legal_collection_v2');
    expect(commands).toHaveLength(2);
    expect(commands[0][1]).toMatchObject({p_vehicle_returned:false,p_actor_id:'actor-1',p_contract_id:'contract-1'});
    expect(commands[1][1]).toMatchObject({p_vehicle_returned:true,p_contract_id:'contract-2'});
    expect(JSON.stringify(commands)).not.toContain('999999');
    expect(from.mock.calls.every(([table])=>table==='contracts')).toBe(true);
  });
  it.each([{company_id:'other'},{customer_id:'other'},{id:'other'},{vehicle_returned:null}])('does not convert a mismatched or custody-unknown record %j',async(change)=>{
    records.set(row.id,{...row,...change});
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate]);
    expect(result.failed).toHaveLength(1);expect(result.converted).toEqual([]);expect(rpc).not.toHaveBeenCalled();
  });
  it('preserves partial outcomes without retrying a failed command',async()=>{
    records.set('contract-2',{...row,id:'contract-2'});
    const original=rpc.getMockImplementation();
    if (!original) throw new Error('Missing fixture RPC');
    rpc.mockImplementation(async(name,args)=>name==='convert_contract_to_legal_collection_v2' && args.p_contract_id==='contract-1'
      ?{data:null,error:{message:'connection lost; outcome uncertain'}}:original(name,args));
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate,{...candidate,contract_id:'contract-2'}]);
    expect(result.failed).toEqual([{contractId:'contract-1',message:'connection lost; outcome uncertain'}]);
    expect(result.converted.map(item=>item.contractId)).toEqual(['contract-2']);
    expect(rpc.mock.calls.filter(([name])=>name==='convert_contract_to_legal_collection_v2')).toHaveLength(2);
  });
  it('reports missing contracts without inserting a case or generating a case number',async()=>{
    records.clear();
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate]);
    expect(result.failed).toHaveLength(1);expect(rpc).not.toHaveBeenCalled();
  });
  it('does not bypass a failed document verification',async()=>{
    rpc.mockResolvedValue({data:false,error:null});
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate]);
    expect(result.failed[0].message).toContain('عقد موقّع');
    expect(rpc.mock.calls.some(([name])=>name==='convert_contract_to_legal_collection_v2')).toBe(false);
  });
  it('allows the server to reuse an already converted contract without claiming a new case was created',async()=>{
    records.set(row.id,{...row,status:'under_legal_procedure'});
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate]);
    expect(result.converted).toHaveLength(1);expect(result.failed).toEqual([]);
    expect(result).not.toHaveProperty('created');
  });
  it('does not count an existing case for a different claim scope as successful conversion',async()=>{
    const original=rpc.getMockImplementation();
    if (!original) throw new Error('Missing fixture RPC');
    rpc.mockImplementation(async(name,args)=>{
      const response=await original(name,args);
      return name==='convert_contract_to_legal_collection_v2'?{...response,data:{...response.data,claim_scope:'traffic_violations_only'}}:response;
    });
    const result=await convertSelectedContractsToLegal('company-1','actor-1',[candidate]);
    expect(result.failed).toHaveLength(1);expect(result.converted).toEqual([]);
  });
  it('rejects ambiguous selections before any side effect',async()=>{
    await expect(convertSelectedContractsToLegal('company-1','actor-1',[candidate,{...candidate,customer_id:'other'}])).rejects.toThrow('متعارضة');
    await expect(convertSelectedContractsToLegal('company-1','actor-1',[{...candidate,contract_id:undefined}])).rejects.toThrow('غير مكتملة');
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
  it('does not issue commands for ineligible selections or absent authentication',async()=>{
    expect(await convertSelectedContractsToLegal('company-1','actor-1',[{...candidate,days_overdue:5}]))
      .toEqual({converted:[],failed:[],ineligible:1});
    await expect(convertSelectedContractsToLegal('company-1','',[candidate])).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();expect(rpc).not.toHaveBeenCalled();
  });
});
