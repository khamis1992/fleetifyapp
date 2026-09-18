import React from 'react';
import { PERMISSIONS } from '@/types/permissions';
export const companyId = '11111111-1111-4111-8111-111111111111';
const company = { id: companyId, name: 'شركة الاختبار للتأجير', currency: 'QAR', default_currency: 'QAR', business_type: 'car_rental', active_modules: ['finance','fleet','hr'], settings: {}, custom_branding: {} };
const user = { id: '22222222-2222-4222-8222-222222222222', email: 'preview@example.test', company, company_id: companyId, role: 'super_admin', roles: ['super_admin'], profile: { company_id: companyId, first_name: 'مراجع', last_name: 'النظام', role: 'super_admin' } };
export const useAuth = () => ({user,session:{user},loading:false,signOut:async()=>{},hasRole:()=>true,isSuperAdmin:true,isAdmin:true});
export const AuthProvider = ({children}: {children:React.ReactNode}) => <>{children}</>;
export const useCompanyContext = () => ({browsedCompany:company,currentCompany:company,company,stableCompanyId:companyId,isBrowsingMode:false});
export const useStableCompanyId = () => companyId;
export const CompanyContextProvider = AuthProvider;
export const useUnifiedCompanyAccess = () => ({companyId,user,hasCompanyAdminAccess:true,hasGlobalAccess:true,isAuthenticating:false,isInitializing:false,filter:{company_id:companyId},getQueryKey:(value:string[])=>[...value,companyId],canAccessCompany:()=>true,context:{companyId,isCompanyScoped:true},validateCompanyAccess:()=>true});
export const usePermissionsCheck = (ids:string[]) => ({data:ids.map(permissionId=>({permissionId,hasPermission:true})),isLoading:false,error:null});
export const usePermissionCheck = () => ({data:{hasPermission:true},isLoading:false,error:null});
export const PERMISSION_ALIASES = {};
export const getPermissionCandidates = (permission:string) => [permission];
export const usePermissions = () => ({hasPermission:()=>true,hasAccess:true,isLoading:false});
export const usePermission = usePermissions;
export const useCompanyAdmin = () => true;
export const useCompanyFilter = () => ({company_id:companyId});
export const useHasAdminAccess = () => true;
export const useCurrentCompanyId = () => companyId;
export const useCompanyIdWithInit = () => ({companyId,isInitializing:false});
export const useHasPermission = () => ({hasPermission:true,isLoading:false});
export const useHasFeature = () => ({hasAccess:true,isLoading:false});
export const useModuleAccess = () => ({hasAccess:true,isLoading:false});
export const useModuleConfig = () => ({data:company,company,isLoading:false,isModuleEnabled:()=>true,enabledModules:['finance'],moduleSettings:[]});
export const useCompanyCurrency = () => ({currency:'QAR',locale:'ar-QA',currencyCode:'QAR',symbol:'ر.ق',isLoading:false});
export const useFleetifyTranslation = () => ({currentLanguage:new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar',t:(key:string,options?:{defaultValue?:string})=>options?.defaultValue || ({fleetify:'فليتيفاي'}[key] || key),isRTL:true});

const customer = {id:'33333333-3333-4333-8333-333333333333',company_id:companyId,first_name:'أحمد',last_name:'السليطي',customer_type:'individual',phone:'',customer_number:'C-001'};
const invoices = Array.from({length:31},(_,i)=>({id:`44444444-4444-4444-8444-${String(i+1).padStart(12,'0')}`,company_id:companyId,invoice_number:`INV-${String(i+1).padStart(4,'0')}`,invoice_type:'sales',invoice_date:'2026-09-01',due_date:'2026-09-01',total_amount:1500,subtotal:1500,tax_amount:0,discount_amount:0,paid_amount:i%2?500:0,balance_due:i%2?1000:1500,status:'sent',payment_status:i%2?'partial':'unpaid',currency:'QAR',customer_id:customer.id,customers:customer,contracts:null,created_at:'2026-09-01T09:00:00Z'}));
const banks = Array.from({length:14},(_,i)=>({id:`55555555-5555-4555-8555-${String(i+1).padStart(12,'0')}`,company_id:companyId,bank_name:`بنك تجريبي ${i+1}`,bank_name_ar:`بنك تجريبي ${i+1}`,account_number:`00123400${i+1}`,current_balance:45000+i*750,opening_balance:0,is_active:true,is_primary:i===0,account_type:'checking',currency:'QAR'}));
const payments = Array.from({length:31},(_,i)=>({id:`66666666-6666-4666-8666-${String(i+1).padStart(12,'0')}`,company_id:companyId,payment_number:`PAY-${String(i+1).padStart(4,'0')}`,payment_type:'receipt',payment_method:i%2?'bank_transfer':'cash',payment_status:'completed',amount:500,payment_date:'2026-09-06',customer_id:customer.id,customers:customer,invoices:{invoice_number:invoices[i].invoice_number,total_amount:1500},contracts:null}));
const vendors = [{id:'77777777-7777-4777-8777-777777777777',company_id:companyId,vendor_code:'SUP-001',vendor_name:'مورد الصيانة التجريبي',vendor_type:'company',phone:'',email:'',is_active:true,current_balance:4200}];
const ledgerAccount = {id:'88888888-8888-4888-8888-888888888888',company_id:companyId,account_code:'1111',account_name:'Cash',account_name_ar:'الصندوق',account_type:'assets',balance_type:'debit',is_header:false,account_level:4};
const tables:Record<string,unknown[]> = {invoices,payments,banks,vendors,customers:[customer],companies:[company],company_settings:[{...company,company_id:companyId}],profiles:[user.profile],user_roles:[{role:'super_admin'}],user_permissions:PERMISSIONS.map(item=>({permission_id:item.id,granted:true})),employees:[{id:user.id,company_id:companyId,has_system_access:true,account_status:'active'}]};
tables.chart_of_accounts = [ledgerAccount];
tables.get_account_balances = [{account_id:ledgerAccount.id, account_code:'1111',account_name:'Cash',account_name_ar:'الصندوق',account_type:'assets',balance_type:'debit',opening_balance:0,total_debits:1500,total_credits:500,closing_balance:1000}];
tables.journal_entry_lines = [{id:'ledger-line-1',account_id:ledgerAccount.id,line_number:1,debit_amount:1500,credit_amount:0,line_description:'تحصيل إيجار',journal_entry_id:'journal-1',journal_entry:{id:'journal-1',company_id:companyId,entry_number:'2026-001',entry_date:'2026-09-01',status:'posted',description:'تحصيل إيجار',reference_type:''}}, {id:'ledger-line-2',account_id:ledgerAccount.id,line_number:1,debit_amount:0,credit_amount:500,line_description:'مصروف صيانة',journal_entry_id:'journal-2',journal_entry:{id:'journal-2',company_id:companyId,entry_number:'2026-002',entry_date:'2026-09-02',status:'posted',description:'مصروف صيانة',reference_type:''}}];
const commands:string[]=[];
const rpcObjects: Record<string, unknown> = {
  get_financial_integrity_report: { checked_at:'2026-09-06T09:00:00Z',company_id:companyId,status:'needs_attention',summary:{completed_payments:31,completed_payments_without_journal:1,unbalanced_journal_entries:0,invoice_paid_amount_mismatches:0,overpaid_invoices:0},issues:[{code:'completed_payment_without_journal',count:1}] },
  check_existing_accounts_summary: { has_existing_accounts:true,accounts_count:3,has_existing_banks:true,banks_count:14,existing_codes:['1111','1112','4312'],existing_bank_accounts:['001234001'] },
};
tables.get_financial_summary = [{total_assets:120000,total_liabilities:45000,total_equity:75000,total_revenue:48000,total_expenses:30000,net_income:18000,unbalanced_entries_count:0}];
Object.assign(window,{financePreviewCommands:commands});
function query(table:string, rpc=false) {
  let single=false,from=0,to=Infinity;
  const filters:[string,unknown][]=[];
  const builder = new Proxy({}, {get(_target,key) {
    if(key==='then') return (resolve:(value:unknown)=>unknown) => {
      if(rpc && table in rpcObjects) return Promise.resolve(resolve({data:rpcObjects[table],error:null}));
      let data = tables[table] || [];
      if(rpc && table.includes('permissions')) data=[];
      for(const [column,value] of filters) if(data.some(row=>Object.hasOwn(row as object,column))) data=data.filter(row=>(row as Record<string,unknown>)[column]===value);
      const count=data.length;
      return Promise.resolve(resolve({data:single ? data[0] || null : data.slice(from,to+1),error:null,count}));
    };
    return (...args:unknown[]) => {
      if(['insert','update','delete','upsert'].includes(String(key))) {commands.push(`${table}.${String(key)}`); throw new Error('Preview writes are disabled');}
      if(key==='single'||key==='maybeSingle') single=true;
      if(key==='range') [from,to]=args as [number,number];
      if(key==='eq') filters.push(args as [string,unknown]);
      return builder;
    };
  }});
  return builder;
}
export const supabase = {
  from:(table:string)=>query(table), rpc:(name:string)=>query(name,true),
  channel:()=>({on(){return this;},subscribe(){return this;},unsubscribe(){}}),removeChannel:()=>{},
  auth:{getSession:async()=>({data:{session:{user}},error:null}),getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:''}}),createSignedUrl:async()=>({data:{signedUrl:''},error:null}),list:async()=>({data:[],error:null})})},
};
